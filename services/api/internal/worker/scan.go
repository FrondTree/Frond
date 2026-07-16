package worker

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/frond-dev/frond/services/api/internal/github"
	"github.com/frond-dev/frond/services/api/internal/graphstore"
	"github.com/frond-dev/frond/services/api/internal/models"
	"github.com/frond-dev/frond/services/api/internal/scanner"
	"github.com/frond-dev/frond/services/api/internal/search"
	"github.com/google/uuid"
)

type ScanWorker struct {
	graph  *graphstore.Store
	search *search.Client
}

func New(graph *graphstore.Store, search *search.Client) *ScanWorker {
	return &ScanWorker{graph: graph, search: search}
}

func (w *ScanWorker) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.processOne(ctx)
			}
		}
	}()
	log.Println("scan worker started")
}

func (w *ScanWorker) processOne(ctx context.Context) {
	job, repo, err := w.graph.ClaimNextScanJob(ctx)
	if err != nil || job == nil {
		return
	}

	token, err := w.graph.GetGitHubToken(ctx, job.OrganizationID)
	if err != nil {
		_ = w.graph.CompleteScanJob(ctx, job.ID, repo.ID, 0, err)
		return
	}

	gh := github.NewClient(token)
	sc := scanner.New(gh)
	parts := strings.SplitN(repo.FullName, "/", 2)
	if len(parts) != 2 {
		_ = w.graph.CompleteScanJob(ctx, job.ID, repo.ID, 0, fmt.Errorf("invalid repo name"))
		return
	}

	result, filesScanned, scanErr := sc.ScanRepository(ctx, parts[0], parts[1], repo.DefaultBranch, repo.Language)
	if scanErr != nil {
		_ = w.graph.CompleteScanJob(ctx, job.ID, repo.ID, filesScanned, scanErr)
		return
	}

	_, saveErr := w.graph.SaveScanResult(ctx, job.OrganizationID, repo, result)
	if saveErr != nil {
		_ = w.graph.CompleteScanJob(ctx, job.ID, repo.ID, filesScanned, saveErr)
		return
	}

	_ = w.graph.MarkDocumentedAPIs(ctx, job.OrganizationID)
	_, _ = w.graph.ComputeHealth(ctx, job.OrganizationID)
	_ = w.indexOrgSearch(ctx, job.OrganizationID)

	_ = w.graph.CompleteScanJob(ctx, job.ID, repo.ID, filesScanned, nil)
	log.Printf("scan completed: %s (%d files)", repo.FullName, filesScanned)
}

func (w *ScanWorker) indexOrgSearch(ctx context.Context, orgID uuid.UUID) error {
	if w.search == nil {
		return nil
	}
	services, err := w.graph.ListServices(ctx, orgID)
	if err != nil {
		return err
	}
	var docs []models.SearchDocument
	for _, svc := range services {
		docs = append(docs, models.SearchDocument{
			ID:      "svc_" + svc.ID.String(),
			Type:    "service",
			Title:   svc.Name,
			Content: svc.Description + " " + svc.Language + " " + svc.Framework,
			URL:     "/dashboard/services/" + svc.ID.String(),
		})
		detail, err := w.graph.GetServiceDetail(ctx, orgID, svc.ID)
		if err != nil {
			continue
		}
		for _, api := range detail.APIs {
			docs = append(docs, models.SearchDocument{
				ID:      "api_" + api.ID.String(),
				Type:    "api",
				Title:   api.Method + " " + api.Path,
				Content: api.Summary + " " + api.Description,
				URL:     "/dashboard/services/" + svc.ID.String(),
			})
		}
		for _, adr := range detail.ADRs {
			docs = append(docs, models.SearchDocument{
				ID:      "adr_" + adr.ID.String(),
				Type:    "adr",
				Title:   adr.Title,
				Content: adr.Content,
				URL:     "/dashboard/services/" + svc.ID.String(),
			})
		}
	}
	return w.search.IndexOrgIntelligence(ctx, orgID.String(), docs)
}
