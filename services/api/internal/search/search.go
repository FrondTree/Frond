package search

import (
	"context"
	"fmt"

	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/meilisearch/meilisearch-go"
)

const indexName = "frond_docs"

type Client struct {
	client meilisearch.ServiceManager
}

func New(url, apiKey string) (*Client, error) {
	c := meilisearch.New(url, meilisearch.WithAPIKey(apiKey))
	return &Client{client: c}, nil
}

func (c *Client) EnsureIndex(ctx context.Context) error {
	_, err := c.client.GetIndex(indexName)
	if err != nil {
		_, err = c.client.CreateIndex(&meilisearch.IndexConfig{
			Uid:        indexName,
			PrimaryKey: "id",
		})
		if err != nil {
			return fmt.Errorf("create index: %w", err)
		}
	}

	_, err = c.client.Index(indexName).UpdateFilterableAttributes(&[]string{"project_id", "organization_id", "type"})
	if err != nil {
		return fmt.Errorf("update filterable: %w", err)
	}

	_, err = c.client.Index(indexName).UpdateSearchableAttributes(&[]string{"title", "content", "url"})
	return err
}

func (c *Client) IndexOrgIntelligence(ctx context.Context, orgID string, docs []models.SearchDocument) error {
	if len(docs) == 0 {
		return nil
	}
	_ = c.EnsureIndex(ctx)
	payload := make([]map[string]interface{}, len(docs))
	for i, d := range docs {
		payload[i] = map[string]interface{}{
			"id":              fmt.Sprintf("org_%s_%s", orgID, d.ID),
			"organization_id": orgID,
			"project_id":      "",
			"type":            d.Type,
			"title":           d.Title,
			"content":         d.Content,
			"url":             d.URL,
		}
	}
	_, err := c.client.Index(indexName).AddDocuments(payload)
	return err
}

func (c *Client) SearchOrg(ctx context.Context, orgID, query string, limit int) ([]models.SearchDocument, error) {
	_ = c.EnsureIndex(ctx)
	resp, err := c.client.Index(indexName).Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Filter: fmt.Sprintf("organization_id = '%s'", orgID),
	})
	if err != nil {
		return nil, err
	}
	results := make([]models.SearchDocument, 0, len(resp.Hits))
	for _, hit := range resp.Hits {
		m, ok := hit.(map[string]interface{})
		if !ok {
			continue
		}
		results = append(results, models.SearchDocument{
			ID:      str(m["id"]),
			Type:    str(m["type"]),
			Title:   str(m["title"]),
			Content: str(m["content"]),
			URL:     str(m["url"]),
		})
	}
	return results, nil
}

func (c *Client) IndexDocuments(ctx context.Context, projectID string, docs []models.SearchDocument) error {
	if len(docs) == 0 {
		return nil
	}

	payload := make([]map[string]interface{}, len(docs))
	for i, d := range docs {
		payload[i] = map[string]interface{}{
			"id":         fmt.Sprintf("%s_%s", projectID, d.ID),
			"project_id": projectID,
			"type":       d.Type,
			"title":      d.Title,
			"content":    d.Content,
			"url":        d.URL,
		}
	}

	_, err := c.client.Index(indexName).AddDocuments(payload)
	return err
}

func (c *Client) DeleteProjectDocuments(ctx context.Context, projectID string) error {
	_, err := c.client.Index(indexName).DeleteDocumentsByFilter(fmt.Sprintf("project_id = '%s'", projectID))
	return err
}

func (c *Client) Search(ctx context.Context, projectID, query string, limit int) ([]models.SearchDocument, error) {
	resp, err := c.client.Index(indexName).Search(query, &meilisearch.SearchRequest{
		Limit: int64(limit),
		Filter: fmt.Sprintf("project_id = '%s'", projectID),
	})
	if err != nil {
		return nil, err
	}

	results := make([]models.SearchDocument, 0, len(resp.Hits))
	for _, hit := range resp.Hits {
		m, ok := hit.(map[string]interface{})
		if !ok {
			continue
		}
		results = append(results, models.SearchDocument{
			ID:      str(m["id"]),
			Type:    str(m["type"]),
			Title:   str(m["title"]),
			Content: str(m["content"]),
			URL:     str(m["url"]),
		})
	}
	return results, nil
}

func str(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
