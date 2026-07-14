package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type Store interface {
	Save(ctx context.Context, key string, reader io.Reader) (string, error)
	Open(ctx context.Context, key string) (io.ReadCloser, error)
	PublicURL(key string) string
}

type LocalStore struct {
	basePath   string
	publicBase string
}

func NewLocalStore(basePath, publicBase string) (*LocalStore, error) {
	if err := os.MkdirAll(basePath, 0o755); err != nil {
		return nil, fmt.Errorf("create storage dir: %w", err)
	}
	return &LocalStore{basePath: basePath, publicBase: publicBase}, nil
}

func (s *LocalStore) Save(ctx context.Context, key string, reader io.Reader) (string, error) {
	fullPath := filepath.Join(s.basePath, key)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", fmt.Errorf("mkdir: %w", err)
	}

	f, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, reader); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}
	return fullPath, nil
}

func (s *LocalStore) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	fullPath := filepath.Join(s.basePath, key)
	return os.Open(fullPath)
}

func (s *LocalStore) PublicURL(key string) string {
	return fmt.Sprintf("%s/%s", s.publicBase, key)
}
