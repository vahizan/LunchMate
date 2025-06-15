# FindMyLunch Domain Architecture

This document outlines the architecture for serving the FindMyLunch application at the domain `findmylunch.com`.

## Domain Configuration Overview

The FindMyLunch application is configured to use the domain `findmylunch.com` with the following components:

### Production Environment

- **Main Website**: `findmylunch.com` and `www.findmylunch.com`
  - Traffic flows through CloudFront to an S3 bucket configured for website hosting
  - HTTPS is enforced with TLS 1.2+
  - ACM certificate covers the main domain and wildcard subdomains

- **API Endpoint**: `api.findmylunch.com`
  - Traffic is routed to API Gateway with a custom domain
  - API Gateway connects to the backend services running on Elastic Beanstalk
  - HTTPS is enforced with TLS 1.2+

### QA Environment

- **QA Website**: `qa.findmylunch.com`
  - Separate CloudFront distribution pointing to a QA-specific S3 bucket
  - Shares the same ACM certificate (wildcard covers all subdomains)

- **QA API**: `api.qa.findmylunch.com`
  - Separate API Gateway stage with custom domain
  - Points to QA backend services

## Infrastructure Components

### DNS (Route 53)
- Hosted zone for `findmylunch.com`
- A records for the main domain, www subdomain, and API subdomains
- Alias records pointing to CloudFront and API Gateway

### SSL/TLS (ACM)
- Main certificate for `findmylunch.com` and `*.findmylunch.com`
- API Gateway certificate for `api.findmylunch.com` and `api.qa.findmylunch.com`

### Content Delivery (CloudFront)
- Production distribution serving `findmylunch.com` and `www.findmylunch.com`
- QA distribution serving `qa.findmylunch.com`
- Cache policies optimized for different content types
- Cache invalidation on deployments

### Storage (S3)
- Production bucket: `findmylunch.com-website`
- QA bucket: `qa-findmylunch.com-website`
- Both configured with appropriate cache headers and security settings

### API (API Gateway)
- Custom domain mapping for `api.findmylunch.com`
- Custom domain mapping for `api.qa.findmylunch.com`
- Regional endpoint configuration

### Backend (Elastic Beanstalk)
- Production environment connected to `api.findmylunch.com`
- QA environment connected to `api.qa.findmylunch.com`

## Deployment Process

The CI/CD pipeline has been updated to:
1. Deploy CloudFormation stacks with domain-specific configurations
2. Validate SSL certificates
3. Deploy frontend assets to the appropriate S3 bucket with optimized cache settings
4. Invalidate CloudFront cache after deployments
5. Configure environment-specific domain settings

## Security Considerations

- All traffic is encrypted with HTTPS
- S3 buckets are not publicly accessible directly (only through CloudFront)
- API Gateway enforces TLS 1.2+
- CloudFront distributions use Origin Access Identity for S3 access