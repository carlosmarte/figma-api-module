# Figma API Endpoints Documentation

**Base URL:** `https://api.figma.com`

## [X] Authentication

All endpoints support one of the following authentication methods:

- **Personal Access Token**: Include in header as `X-Figma-Token: {token}`
- **OAuth2**: Standard OAuth2 flow with specific scopes
- **Organization OAuth2**: Required for organization-level operations

---

## [x] Files

| Method | Endpoint                        | Summary                          | Authentication Scopes              |
| ------ | ------------------------------- | -------------------------------- | ---------------------------------- |
| GET    | `/v1/files/{file_key}`          | Get file JSON                    | `file_content:read`, `files:read`  |
| GET    | `/v1/files/{file_key}/nodes`    | Get file JSON for specific nodes | `file_content:read`, `files:read`  |
| GET    | `/v1/images/{file_key}`         | Render images of file nodes      | `file_content:read`, `files:read`  |
| GET    | `/v1/files/{file_key}/images`   | Get image fills                  | `file_content:read`, `files:read`  |
| GET    | `/v1/files/{file_key}/meta`     | Get file metadata                | `file_metadata:read`, `files:read` |
| GET    | `/v1/files/{file_key}/versions` | Get versions of a file           | `file_versions:read`, `files:read` |

---

## [x] Projects

| Method | Endpoint                          | Summary                | Authentication Scopes         |
| ------ | --------------------------------- | ---------------------- | ----------------------------- |
| GET    | `/v1/teams/{team_id}/projects`    | Get projects in a team | `projects:read`, `files:read` |
| GET    | `/v1/projects/{project_id}/files` | Get files in a project | `projects:read`, `files:read` |

---

## [x] Comments

| Method | Endpoint                                     | Summary                 | Authentication Scopes              |
| ------ | -------------------------------------------- | ----------------------- | ---------------------------------- |
| GET    | `/v1/files/{file_key}/comments`              | Get comments in a file  | `file_comments:read`, `files:read` |
| POST   | `/v1/files/{file_key}/comments`              | Add a comment to a file | `file_comments:write`              |
| DELETE | `/v1/files/{file_key}/comments/{comment_id}` | Delete a comment        | `file_comments:write`              |

---

## [x] Comment Reactions

| Method | Endpoint                                               | Summary                     | Authentication Scopes              |
| ------ | ------------------------------------------------------ | --------------------------- | ---------------------------------- |
| GET    | `/v1/files/{file_key}/comments/{comment_id}/reactions` | Get reactions for a comment | `file_comments:read`, `files:read` |
| POST   | `/v1/files/{file_key}/comments/{comment_id}/reactions` | Add a reaction to a comment | `file_comments:write`              |
| DELETE | `/v1/files/{file_key}/comments/{comment_id}/reactions` | Delete a reaction           | `file_comments:write`              |

---

## [ ] Users

| Method | Endpoint | Summary          | Authentication Scopes             |
| ------ | -------- | ---------------- | --------------------------------- |
| GET    | `/v1/me` | Get current user | `current_user:read`, `files:read` |

---

## [ ] Components

| Method | Endpoint                          | Summary             | Authentication Scopes                     |
| ------ | --------------------------------- | ------------------- | ----------------------------------------- |
| GET    | `/v1/teams/{team_id}/components`  | Get team components | `team_library_content:read`, `files:read` |
| GET    | `/v1/files/{file_key}/components` | Get file components | `library_content:read`, `files:read`      |
| GET    | `/v1/components/{key}`            | Get component       | `library_assets:read`, `files:read`       |

---

## [ ] Component Sets

| Method | Endpoint                              | Summary                 | Authentication Scopes                     |
| ------ | ------------------------------------- | ----------------------- | ----------------------------------------- |
| GET    | `/v1/teams/{team_id}/component_sets`  | Get team component sets | `team_library_content:read`, `files:read` |
| GET    | `/v1/files/{file_key}/component_sets` | Get file component sets | `library_content:read`, `files:read`      |
| GET    | `/v1/component_sets/{key}`            | Get component set       | `library_assets:read`, `files:read`       |

---

## [ ] Styles

| Method | Endpoint                      | Summary         | Authentication Scopes                     |
| ------ | ----------------------------- | --------------- | ----------------------------------------- |
| GET    | `/v1/teams/{team_id}/styles`  | Get team styles | `team_library_content:read`, `files:read` |
| GET    | `/v1/files/{file_key}/styles` | Get file styles | `library_content:read`, `files:read`      |
| GET    | `/v1/styles/{key}`            | Get style       | `library_assets:read`, `files:read`       |

---

## [ ] Webhooks

| Method | Endpoint                             | Summary                         | Authentication Scopes         |
| ------ | ------------------------------------ | ------------------------------- | ----------------------------- |
| GET    | `/v2/webhooks`                       | Get webhooks by context or plan | `webhooks:read`               |
| POST   | `/v2/webhooks`                       | Create a webhook                | `webhooks:write`              |
| GET    | `/v2/webhooks/{webhook_id}`          | Get a webhook                   | `webhooks:read`, `files:read` |
| PUT    | `/v2/webhooks/{webhook_id}`          | Update a webhook                | `webhooks:write`              |
| DELETE | `/v2/webhooks/{webhook_id}`          | Delete a webhook                | `webhooks:write`              |
| GET    | `/v2/webhooks/{webhook_id}/requests` | Get webhook requests            | `webhooks:read`, `files:read` |

---

## [ ] Activity Logs

| Method | Endpoint            | Summary           | Authentication Scopes                                  |
| ------ | ------------------- | ----------------- | ------------------------------------------------------ |
| GET    | `/v1/activity_logs` | Get activity logs | `org:activity_log_read` (Organization OAuth2 required) |

---

## [ ] Payments

| Method | Endpoint       | Summary      | Authentication Scopes |
| ------ | -------------- | ------------ | --------------------- |
| GET    | `/v1/payments` | Get payments | Personal Access Token |

---

## [ ] Variables

| Method | Endpoint                                   | Summary                        | Authentication Scopes                    |
| ------ | ------------------------------------------ | ------------------------------ | ---------------------------------------- |
| GET    | `/v1/files/{file_key}/variables/local`     | Get local variables            | `file_variables:read` (Enterprise only)  |
| GET    | `/v1/files/{file_key}/variables/published` | Get published variables        | `file_variables:read` (Enterprise only)  |
| POST   | `/v1/files/{file_key}/variables`           | Create/modify/delete variables | `file_variables:write` (Enterprise only) |

---

## [ ] Dev Resources

| Method | Endpoint                                               | Summary              | Authentication Scopes      |
| ------ | ------------------------------------------------------ | -------------------- | -------------------------- |
| GET    | `/v1/files/{file_key}/dev_resources`                   | Get dev resources    | `file_dev_resources:read`  |
| POST   | `/v1/dev_resources`                                    | Create dev resources | `file_dev_resources:write` |
| PUT    | `/v1/dev_resources`                                    | Update dev resources | `file_dev_resources:write` |
| DELETE | `/v1/files/{file_key}/dev_resources/{dev_resource_id}` | Delete dev resource  | `file_dev_resources:write` |

---

## [ ] Library Analytics

| Method | Endpoint                                               | Summary                                     | Authentication Scopes    |
| ------ | ------------------------------------------------------ | ------------------------------------------- | ------------------------ |
| GET    | `/v1/analytics/libraries/{file_key}/component/actions` | Get library analytics component action data | `library_analytics:read` |
| GET    | `/v1/analytics/libraries/{file_key}/component/usages`  | Get library analytics component usage data  | `library_analytics:read` |
| GET    | `/v1/analytics/libraries/{file_key}/style/actions`     | Get library analytics style action data     | `library_analytics:read` |
| GET    | `/v1/analytics/libraries/{file_key}/style/usages`      | Get library analytics style usage data      | `library_analytics:read` |
| GET    | `/v1/analytics/libraries/{file_key}/variable/actions`  | Get library analytics variable action data  | `library_analytics:read` |
| GET    | `/v1/analytics/libraries/{file_key}/variable/usages`   | Get library analytics variable usage data   | `library_analytics:read` |

---

## [ ] OAuth2 Scopes Reference

| Scope                       | Description                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `current_user:read`         | Read your name, email, and profile image                                                          |
| `file_comments:read`        | Read the comments for files                                                                       |
| `file_comments:write`       | Post and delete comments and comment reactions in files                                           |
| `file_content:read`         | Read the contents of files, such as nodes and the editor type                                     |
| `file_dev_resources:read`   | Read dev resources in files                                                                       |
| `file_dev_resources:write`  | Write to dev resources in files                                                                   |
| `file_metadata:read`        | Read metadata of files                                                                            |
| `file_variables:read`       | Read variables in Figma file (Enterprise organizations only)                                      |
| `file_variables:write`      | Write to variables in Figma file (Enterprise organizations only)                                  |
| `file_versions:read`        | Read the version history for files you can access                                                 |
| `files:read`                | _Deprecated_ - Read files, projects, users, versions, comments, components & styles, and webhooks |
| `library_analytics:read`    | Read library analytics data                                                                       |
| `library_assets:read`       | Read data of individual published components and styles                                           |
| `library_content:read`      | Read published components and styles of files                                                     |
| `projects:read`             | List projects and files in projects                                                               |
| `team_library_content:read` | Read published components and styles of teams                                                     |
| `webhooks:read`             | Read metadata of webhooks                                                                         |
| `webhooks:write`            | Create and manage webhooks                                                                        |
| `org:activity_log_read`     | Read activity logs in the organization                                                            |

---

## [ ] Notes

- **Total Endpoints**: 46 endpoints across 11 categories
- **Authentication**: Most endpoints support both Personal Access Tokens and OAuth2
- **Enterprise Features**: Variables API requires Enterprise organization membership
- **Organization Features**: Activity logs require organization-level OAuth2 authentication
- **Deprecated**: Team webhooks endpoint (`/v2/teams/{team_id}/webhooks`) is deprecated
- **Rate Limiting**: All endpoints are subject to rate limiting (status code 429)

---

_Generated from Figma OpenAPI v3.1.0 specification_
