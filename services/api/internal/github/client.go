package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/frond-dev/frond/services/api/internal/models"
	"golang.org/x/oauth2"
	githuboauth "golang.org/x/oauth2/github"
)

type Client struct {
	httpClient *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second, Transport: &authTransport{token: token}},
	}
}

type authTransport struct {
	token string
}

func (t *authTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+t.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	return http.DefaultTransport.RoundTrip(req)
}

type OAuthService struct {
	oauth *oauth2.Config
}

func NewOAuthService(clientID, clientSecret, redirectURL string) *OAuthService {
	return &OAuthService{
		oauth: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"read:user", "repo"},
			Endpoint:     githuboauth.Endpoint,
		},
	}
}

func (s *OAuthService) AuthURL(state string) string {
	return s.oauth.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *OAuthService) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauth.Exchange(ctx, code)
}

func (s *OAuthService) Client(ctx context.Context, token *oauth2.Token) *Client {
	return NewClient(token.AccessToken)
}

type GitHubUser struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Name  string `json:"name"`
}

func (c *Client) GetUser(ctx context.Context) (*GitHubUser, error) {
	var user GitHubUser
	if err := c.getJSON(ctx, "https://api.github.com/user", &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (c *Client) ListRepos(ctx context.Context, perPage int) ([]models.GitHubRepoListing, error) {
	if perPage <= 0 {
		perPage = 100
	}
	var all []models.GitHubRepoListing
	page := 1
	for {
		var batch []models.GitHubRepoListing
		u := fmt.Sprintf("https://api.github.com/user/repos?per_page=%d&page=%d&sort=updated", perPage, page)
		if err := c.getJSON(ctx, u, &batch); err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		for _, r := range batch {
			all = append(all, models.GitHubRepoListing{
				ID: r.ID, FullName: r.FullName, Name: r.Name, Description: r.Description,
				Language: r.Language, HTMLURL: r.HTMLURL, DefaultBranch: r.DefaultBranch, Private: r.Private,
			})
		}
		if len(batch) < perPage {
			break
		}
		page++
		if page > 10 {
			break
		}
	}
	return all, nil
}

type TreeEntry struct {
	Path string `json:"path"`
	Type string `json:"type"`
	SHA  string `json:"sha"`
	Size int    `json:"size"`
}

type TreeResponse struct {
	Tree []TreeEntry `json:"tree"`
}

func (c *Client) ListTree(ctx context.Context, owner, repo, branch string) ([]TreeEntry, error) {
	refURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/ref/heads/%s", owner, repo, branch)
	var ref struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	if err := c.getJSON(ctx, refURL, &ref); err != nil {
		return nil, err
	}

	treeURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/trees/%s?recursive=1", owner, repo, ref.Object.SHA)
	var tree TreeResponse
	if err := c.getJSON(ctx, treeURL, &tree); err != nil {
		return nil, err
	}
	return tree.Tree, nil
}

func (c *Client) GetFileContent(ctx context.Context, owner, repo, path, ref string) (string, error) {
	u := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s?ref=%s", owner, repo, url.PathEscape(path), ref)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("github contents %s: %s", resp.Status, string(body))
	}

	var content struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&content); err != nil {
		return "", err
	}
	if content.Encoding != "base64" {
		return content.Content, nil
	}
	decoded, err := decodeBase64Content(content.Content)
	if err != nil {
		return "", err
	}
	return decoded, nil
}

type PRFile struct {
	Filename string `json:"filename"`
	Status   string `json:"status"`
	Patch    string `json:"patch"`
}

func (c *Client) GetPRFiles(ctx context.Context, owner, repo string, prNumber int) ([]PRFile, error) {
	u := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/files", owner, repo, prNumber)
	var files []PRFile
	if err := c.getJSON(ctx, u, &files); err != nil {
		return nil, err
	}
	return files, nil
}

func (c *Client) CreatePRComment(ctx context.Context, owner, repo string, prNumber int, body string) error {
	u := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments", owner, repo, prNumber)
	payload, _ := json.Marshal(map[string]string{"body": body})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github comment %s: %s", resp.Status, strings.TrimSpace(string(b)))
	}
	return nil
}

func (c *Client) getJSON(ctx context.Context, url string, dest interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github api %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	return json.NewDecoder(resp.Body).Decode(dest)
}
