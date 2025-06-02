# LunchMate Domain Architecture

This document outlines the architecture for serving the LunchMate application at the domain `whatsforlunch.to`.

## Domain Configuration Overview

The LunchMate application is configured to use the domain `whatsforlunch.to` with the following components:

### Production Environment

- **Main Website**: `whatsforlunch.to` and `www.whatsforlunch.to`
  - Traffic flows through CloudFront to an S3 bucket configured for website hosting
  - HTTPS is enforced with TLS 1.2+
  - ACM certificate covers the main domain and wildcard subdomains

- **API Endpoint**: `api.whatsforlunch.to`
  - Traffic is routed to API Gateway with a custom domain
  - API Gateway connects to the backend services running on Elastic Beanstalk
  - HTTPS is enforced with TLS 1.2+

### QA Environment

- **QA Website**: `qa.whatsforlunch.to`
  - Separate CloudFront distribution pointing to a QA-specific S3 bucket
  - Shares the same ACM certificate (wildcard covers all subdomains)

- **QA API**: `api.qa.whatsforlunch.to`
  - Separate API Gateway stage with custom domain
  - Points to QA backend services

## Infrastructure Components

### DNS (Route 53)
- Hosted zone for `whatsforlunch.to`
- A records for the main domain, www subdomain, and API subdomains
- Alias records pointing to CloudFront and API Gateway

### SSL/TLS (ACM)
- Main certificate for `whatsforlunch.to` and `*.whatsforlunch.to`
- API Gateway certificate for `api.whatsforlunch.to` and `api.qa.whatsforlunch.to`

### Content Delivery (CloudFront)
- Production distribution serving `whatsforlunch.to` and `www.whatsforlunch.to`
- QA distribution serving `qa.whatsforlunch.to`
- Cache policies optimized for different content types
- Cache invalidation on deployments

### Storage (S3)
- Production bucket: `whatsforlunch.to-website`
- QA bucket: `qa-whatsforlunch.to-website`
- Both configured with appropriate cache headers and security settings

### API (API Gateway)
- Custom domain mapping for `api.whatsforlunch.to`
- Custom domain mapping for `api.qa.whatsforlunch.to`
- Regional endpoint configuration

### Backend (Elastic Beanstalk)
- Production environment connected to `api.whatsforlunch.to`
- QA environment connected to `api.qa.whatsforlunch.to`

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