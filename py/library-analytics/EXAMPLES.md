# Figma Library Analytics - Usage Examples

This document provides comprehensive examples of using the Figma Library Analytics SDK, CLI, and API server.

## Table of Contents

- [SDK Examples](#sdk-examples)
- [CLI Examples](#cli-examples)
- [API Server Examples](#api-server-examples)
- [Integration Examples](#integration-examples)
- [Advanced Use Cases](#advanced-use-cases)

## SDK Examples

### Basic Setup

```python
import asyncio
from datetime import date, timedelta
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

# Initialize SDK
async def main():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Your analytics code here
        pass

asyncio.run(main())
```

### Component Analytics

#### Get Component Actions by Asset

```python
async def get_component_performance():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get last 30 days of component actions
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        response = await sdk.get_component_actions(
            file_key="ABC123XYZ",
            group_by=GroupBy.COMPONENT,
            start_date=start_date,
            end_date=end_date
        )
        
        print(f"Found {len(response.rows)} components")
        
        for action in response.rows:
            efficiency = action.insertions / (action.detachments + 1)  # Avoid div by zero
            print(f"""
Component: {action.component_name}
- Insertions: {action.insertions}
- Detachments: {action.detachments}
- Efficiency Ratio: {efficiency:.2f}
- Component Set: {action.component_set_name or 'N/A'}
            """.strip())

asyncio.run(get_component_performance())
```

#### Get Component Actions by Team

```python
async def analyze_team_usage():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        response = await sdk.get_component_actions(
            file_key="ABC123XYZ",
            group_by=GroupBy.TEAM
        )
        
        # Sort teams by total activity
        team_activity = sorted(
            response.rows,
            key=lambda x: x.insertions + x.detachments,
            reverse=True
        )
        
        print("Team Activity Ranking:")
        for i, team in enumerate(team_activity[:10], 1):
            total_activity = team.insertions + team.detachments
            print(f"{i}. {team.team_name} ({team.workspace_name}): {total_activity} actions")

asyncio.run(analyze_team_usage())
```

#### Get Component Usage Data

```python
async def find_popular_components():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        response = await sdk.get_component_usages(
            file_key="ABC123XYZ",
            group_by=GroupBy.COMPONENT
        )
        
        # Find most popular components
        popular_components = sorted(
            response.rows,
            key=lambda x: x.usages,
            reverse=True
        )
        
        print("Most Popular Components:")
        for component in popular_components[:5]:
            print(f"""
{component.component_name}:
- Total Usages: {component.usages}
- Used by {component.teams_using} teams
- Used in {component.files_using} files
- Adoption Rate: {(component.teams_using / max(component.files_using, 1)) * 100:.1f}%
            """.strip())

asyncio.run(find_popular_components())
```

### Style Analytics

#### Track Style Adoption

```python
async def track_style_adoption():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get current usage
        usage_response = await sdk.get_style_usages(
            file_key="ABC123XYZ",
            group_by=GroupBy.STYLE
        )
        
        # Get recent actions
        actions_response = await sdk.get_style_actions(
            file_key="ABC123XYZ",
            group_by=GroupBy.STYLE,
            start_date=date.today() - timedelta(days=7)
        )
        
        # Combine data for insights
        style_insights = {}
        
        # Add usage data
        for usage in usage_response.rows:
            style_insights[usage.style_key] = {
                'name': usage.style_name,
                'type': usage.style_type,
                'total_usages': usage.usages,
                'teams_using': usage.teams_using,
                'files_using': usage.files_using,
                'weekly_insertions': 0,
                'weekly_detachments': 0
            }
        
        # Add recent action data
        for action in actions_response.rows:
            if action.style_key in style_insights:
                style_insights[action.style_key]['weekly_insertions'] += action.insertions
                style_insights[action.style_key]['weekly_detachments'] += action.detachments
        
        # Find trending styles
        trending_styles = sorted(
            style_insights.values(),
            key=lambda x: x['weekly_insertions'],
            reverse=True
        )
        
        print("Trending Styles This Week:")
        for style in trending_styles[:5]:
            trend_ratio = style['weekly_insertions'] / max(style['total_usages'], 1) * 100
            print(f"""
{style['name']} ({style['type']}):
- Weekly Insertions: {style['weekly_insertions']}
- Total Usages: {style['total_usages']}
- Trend Rate: {trend_ratio:.2f}%
            """.strip())

asyncio.run(track_style_adoption())
```

### Variable Analytics

#### Analyze Variable Usage Patterns

```python
async def analyze_variable_patterns():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        response = await sdk.get_variable_usages(
            file_key="ABC123XYZ",
            group_by=GroupBy.VARIABLE
        )
        
        # Group by collection
        collections = {}
        for variable in response.rows:
            collection_name = variable.collection_name
            if collection_name not in collections:
                collections[collection_name] = {
                    'variables': [],
                    'total_usages': 0,
                    'total_teams': set(),
                    'total_files': set()
                }
            
            collections[collection_name]['variables'].append(variable)
            collections[collection_name]['total_usages'] += variable.usages
            collections[collection_name]['total_teams'].add(variable.teams_using)
            collections[collection_name]['total_files'].add(variable.files_using)
        
        print("Variable Collection Analysis:")
        for collection_name, data in collections.items():
            avg_usage = data['total_usages'] / len(data['variables'])
            print(f"""
Collection: {collection_name}
- Variables: {len(data['variables'])}
- Total Usages: {data['total_usages']}
- Average Usage per Variable: {avg_usage:.1f}
- Teams Using: {len(data['total_teams'])}
- Files Using: {len(data['total_files'])}
            """.strip())
            
            # Show top variables in collection
            top_variables = sorted(data['variables'], key=lambda x: x.usages, reverse=True)[:3]
            print("  Top Variables:")
            for var in top_variables:
                print(f"    - {var.variable_name} ({var.variable_type}): {var.usages} usages")

asyncio.run(analyze_variable_patterns())
```

### Batch Operations and Streaming

#### Process Large Datasets

```python
async def process_all_component_data():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get all component actions across all pages
        all_actions = await sdk.get_all_component_actions(
            file_key="ABC123XYZ",
            group_by=GroupBy.COMPONENT,
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31)
        )
        
        print(f"Processing {len(all_actions)} component actions...")
        
        # Analyze the data
        monthly_stats = {}
        for action in all_actions:
            month = action.week[:7]  # Extract YYYY-MM
            if month not in monthly_stats:
                monthly_stats[month] = {'insertions': 0, 'detachments': 0, 'components': set()}
            
            monthly_stats[month]['insertions'] += action.insertions
            monthly_stats[month]['detachments'] += action.detachments
            monthly_stats[month]['components'].add(action.component_key)
        
        print("\nMonthly Component Activity:")
        for month in sorted(monthly_stats.keys()):
            stats = monthly_stats[month]
            print(f"{month}: {stats['insertions']} insertions, {stats['detachments']} detachments, {len(stats['components'])} unique components")

asyncio.run(process_all_component_data())
```

#### Stream Data for Real-time Processing

```python
async def stream_component_analysis():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        total_insertions = 0
        component_count = 0
        
        print("Streaming component data...")
        
        async for action in sdk.stream_component_actions(
            file_key="ABC123XYZ",
            group_by=GroupBy.COMPONENT
        ):
            total_insertions += action.insertions
            component_count += 1
            
            # Process each component as it arrives
            if action.insertions > 50:  # High-usage components
                print(f"High-usage component: {action.component_name} ({action.insertions} insertions)")
            
            # Progress indicator
            if component_count % 100 == 0:
                avg_insertions = total_insertions / component_count
                print(f"Processed {component_count} components, avg insertions: {avg_insertions:.1f}")
        
        print(f"\nCompleted: {component_count} components, {total_insertions} total insertions")

asyncio.run(stream_component_analysis())
```

### Search and Filtering

#### Search Components by Name

```python
async def find_button_components():
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Search for button-related components
        button_components = await sdk.search_components_by_name(
            file_key="ABC123XYZ",
            component_name="button"
        )
        
        print(f"Found {len(button_components)} button components:")
        
        for component in button_components:
            popularity_score = component.insertions * 0.8 - component.detachments * 0.2
            print(f"""
{component.component_name}:
- Insertions: {component.insertions}
- Detachments: {component.detachments}
- Popularity Score: {popularity_score:.1f}
- Week: {component.week}
            """.strip())

asyncio.run(find_button_components())
```

## CLI Examples

### Basic Commands

```bash
# Set your API token
export FIGMA_TOKEN="your-api-token"

# Get component actions with table output
figma-analytics component-actions ABC123XYZ --group-by component

# Get component usages with JSON output
figma-analytics component-usages ABC123XYZ --group-by file --format json

# Save data to file
figma-analytics style-actions ABC123XYZ --group-by style --output styles.json
```

### Using Figma URLs

```bash
# Use full Figma URL instead of file key
figma-analytics component-actions "https://www.figma.com/file/ABC123XYZ/Design-System" --group-by component

# Works with any valid Figma file URL
figma-analytics variable-usages "https://www.figma.com/file/XYZ789/Component-Library" --group-by variable
```

### Date Range Queries

```bash
# Get data for specific date range
figma-analytics component-actions ABC123XYZ \
    --group-by component \
    --start-date 2023-01-01 \
    --end-date 2023-12-31

# Get last month's data
figma-analytics style-actions ABC123XYZ \
    --group-by team \
    --start-date 2023-11-01 \
    --end-date 2023-11-30 \
    --format json \
    --output november-styles.json
```

### Different Output Formats

```bash
# Table format (default) - great for quick viewing
figma-analytics component-usages ABC123XYZ --group-by component --format table

# JSON format - great for further processing
figma-analytics style-usages ABC123XYZ --group-by style --format json

# Save JSON to file for analysis
figma-analytics variable-actions ABC123XYZ \
    --group-by variable \
    --format json \
    --output variables.json
```

### Advanced CLI Usage

```bash
# Process multiple libraries in a script
for file_key in "ABC123" "DEF456" "GHI789"; do
    echo "Processing library: $file_key"
    figma-analytics component-usages $file_key \
        --group-by component \
        --format json \
        --output "library-${file_key}-components.json"
done

# Combine with jq for JSON processing
figma-analytics component-actions ABC123XYZ \
    --group-by component \
    --format json | \
    jq '.[] | select(.insertions > 100) | {name: .component_name, insertions: .insertions}'
```

## API Server Examples

### Starting the Server

```bash
# Basic server start
figma-analytics serve

# Custom configuration
figma-analytics serve \
    --port 3000 \
    --host 127.0.0.1 \
    --api-key "your-token" \
    --reload
```

### Making API Requests

#### Using curl

```bash
# Component actions with header authentication
curl -H "X-Figma-Token: your-token" \
    "http://localhost:8000/v1/analytics/libraries/ABC123/component/actions?group_by=component"

# Component usages with query parameter authentication
curl "http://localhost:8000/v1/analytics/libraries/ABC123/component/usages?group_by=file&token=your-token"

# Style actions with date range
curl -H "X-Figma-Token: your-token" \
    "http://localhost:8000/v1/analytics/libraries/ABC123/style/actions?group_by=style&start_date=2023-01-01&end_date=2023-12-31"

# Variable usages with pagination
curl -H "X-Figma-Token: your-token" \
    "http://localhost:8000/v1/analytics/libraries/ABC123/variable/usages?group_by=variable&cursor=next_page_cursor"
```

#### Using Python requests

```python
import requests

# Setup
BASE_URL = "http://localhost:8000"
HEADERS = {"X-Figma-Token": "your-token"}
FILE_KEY = "ABC123XYZ"

# Get component actions
response = requests.get(
    f"{BASE_URL}/v1/analytics/libraries/{FILE_KEY}/component/actions",
    headers=HEADERS,
    params={"group_by": "component"}
)
data = response.json()
print(f"Found {len(data['rows'])} component actions")

# Get style usages with error handling
response = requests.get(
    f"{BASE_URL}/v1/analytics/libraries/{FILE_KEY}/style/usages",
    headers=HEADERS,
    params={"group_by": "style"}
)

if response.status_code == 200:
    data = response.json()
    for style in data['rows']:
        print(f"{style['style_name']}: {style['usages']} usages")
elif response.status_code == 401:
    print("Authentication failed - check your token")
elif response.status_code == 403:
    print("Access forbidden - check your permissions")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

#### Using JavaScript/TypeScript

```javascript
// Using fetch API
const BASE_URL = 'http://localhost:8000';
const API_TOKEN = 'your-token';
const FILE_KEY = 'ABC123XYZ';

async function getComponentActions() {
    try {
        const response = await fetch(
            `${BASE_URL}/v1/analytics/libraries/${FILE_KEY}/component/actions?group_by=component`,
            {
                headers: {
                    'X-Figma-Token': API_TOKEN
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.rows.length} component actions`);
        
        // Process the data
        data.rows.forEach(action => {
            console.log(`${action.component_name}: ${action.insertions} insertions`);
        });
        
    } catch (error) {
        console.error('Error fetching component actions:', error);
    }
}

getComponentActions();
```

## Integration Examples

### Slack Bot Integration

```python
import asyncio
from datetime import date, timedelta
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

async def weekly_library_report(file_key: str, webhook_url: str):
    """Generate weekly library analytics report for Slack."""
    
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get last week's data
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        # Get component actions
        component_actions = await sdk.get_component_actions(
            file_key=file_key,
            group_by=GroupBy.COMPONENT,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate metrics
        total_insertions = sum(action.insertions for action in component_actions.rows)
        total_detachments = sum(action.detachments for action in component_actions.rows)
        active_components = len([a for a in component_actions.rows if a.insertions > 0])
        
        # Find top performing components
        top_components = sorted(
            component_actions.rows,
            key=lambda x: x.insertions,
            reverse=True
        )[:5]
        
        # Build Slack message
        message = {
            "text": "📊 Weekly Library Analytics Report",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "📊 Weekly Library Analytics Report"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Total Insertions:* {total_insertions}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Total Detachments:* {total_detachments}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Active Components:* {active_components}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Health Ratio:* {(total_insertions / max(total_detachments, 1)):.2f}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Top Performing Components:*\n" + 
                               "\n".join([f"• {c.component_name}: {c.insertions} insertions" 
                                        for c in top_components])
                    }
                }
            ]
        }
        
        # Send to Slack (using requests or your preferred HTTP client)
        import requests
        requests.post(webhook_url, json=message)

# Usage
asyncio.run(weekly_library_report("ABC123XYZ", "https://hooks.slack.com/your-webhook"))
```

### Dashboard Data Export

```python
import asyncio
import json
from datetime import date, timedelta
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

async def export_dashboard_data(file_key: str, output_file: str):
    """Export comprehensive analytics data for dashboard visualization."""
    
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        dashboard_data = {
            "generated_at": date.today().isoformat(),
            "file_key": file_key,
            "metrics": {}
        }
        
        # Get component data
        print("Fetching component data...")
        component_actions = await sdk.get_all_component_actions(
            file_key=file_key,
            group_by=GroupBy.COMPONENT,
            start_date=date.today() - timedelta(days=90)
        )
        
        component_usages = await sdk.get_component_usages(
            file_key=file_key,
            group_by=GroupBy.COMPONENT
        )
        
        # Get style data
        print("Fetching style data...")
        style_usages = await sdk.get_style_usages(
            file_key=file_key,
            group_by=GroupBy.STYLE
        )
        
        # Get variable data
        print("Fetching variable data...")
        variable_usages = await sdk.get_variable_usages(
            file_key=file_key,
            group_by=GroupBy.VARIABLE
        )
        
        # Process and structure data
        dashboard_data["metrics"] = {
            "components": {
                "total_actions": len(component_actions),
                "total_usages": len(component_usages.rows),
                "top_components": [
                    {
                        "name": comp.component_name,
                        "usages": comp.usages,
                        "teams_using": comp.teams_using,
                        "files_using": comp.files_using
                    }
                    for comp in sorted(component_usages.rows, key=lambda x: x.usages, reverse=True)[:10]
                ],
                "recent_activity": [
                    {
                        "name": action.component_name,
                        "insertions": action.insertions,
                        "detachments": action.detachments,
                        "week": action.week
                    }
                    for action in component_actions[-20:]  # Last 20 activities
                ]
            },
            "styles": {
                "total_styles": len(style_usages.rows),
                "top_styles": [
                    {
                        "name": style.style_name,
                        "type": style.style_type,
                        "usages": style.usages,
                        "teams_using": style.teams_using
                    }
                    for style in sorted(style_usages.rows, key=lambda x: x.usages, reverse=True)[:10]
                ]
            },
            "variables": {
                "total_variables": len(variable_usages.rows),
                "collections": {},
                "top_variables": [
                    {
                        "name": var.variable_name,
                        "type": var.variable_type,
                        "collection": var.collection_name,
                        "usages": var.usages
                    }
                    for var in sorted(variable_usages.rows, key=lambda x: x.usages, reverse=True)[:10]
                ]
            }
        }
        
        # Group variables by collection
        for var in variable_usages.rows:
            collection = var.collection_name
            if collection not in dashboard_data["metrics"]["variables"]["collections"]:
                dashboard_data["metrics"]["variables"]["collections"][collection] = {
                    "variable_count": 0,
                    "total_usages": 0
                }
            dashboard_data["metrics"]["variables"]["collections"][collection]["variable_count"] += 1
            dashboard_data["metrics"]["variables"]["collections"][collection]["total_usages"] += var.usages
        
        # Save to file
        with open(output_file, 'w') as f:
            json.dump(dashboard_data, f, indent=2)
        
        print(f"Dashboard data exported to {output_file}")

# Usage
asyncio.run(export_dashboard_data("ABC123XYZ", "dashboard_data.json"))
```

## Advanced Use Cases

### Component Health Monitoring

```python
import asyncio
from datetime import date, timedelta
from figma_library_analytics import FigmaAnalyticsSDK, GroupBy

async def monitor_component_health(file_key: str):
    """Monitor component health and identify problematic components."""
    
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        # Get recent actions and current usage
        recent_actions = await sdk.get_all_component_actions(
            file_key=file_key,
            group_by=GroupBy.COMPONENT,
            start_date=date.today() - timedelta(days=30)
        )
        
        current_usage = await sdk.get_component_usages(
            file_key=file_key,
            group_by=GroupBy.COMPONENT
        )
        
        # Create lookup for current usage
        usage_lookup = {comp.component_key: comp for comp in current_usage.rows}
        
        # Analyze component health
        health_report = []
        
        for action in recent_actions:
            usage_data = usage_lookup.get(action.component_key)
            if not usage_data:
                continue
            
            # Calculate health metrics
            detachment_rate = action.detachments / max(action.insertions, 1)
            adoption_rate = usage_data.teams_using / max(usage_data.files_using, 1)
            total_activity = action.insertions + action.detachments
            
            # Health scoring
            health_score = 100
            
            # Penalties
            if detachment_rate > 0.3:  # High detachment rate
                health_score -= 30
            if adoption_rate < 0.5:  # Low adoption rate
                health_score -= 20
            if total_activity == 0:  # No activity
                health_score -= 50
            if usage_data.usages < 5:  # Very low usage
                health_score -= 15
            
            health_report.append({
                'component_name': action.component_name,
                'component_key': action.component_key,
                'health_score': max(health_score, 0),
                'detachment_rate': detachment_rate,
                'adoption_rate': adoption_rate,
                'total_usages': usage_data.usages,
                'teams_using': usage_data.teams_using,
                'recent_insertions': action.insertions,
                'recent_detachments': action.detachments
            })
        
        # Sort by health score
        health_report.sort(key=lambda x: x['health_score'])
        
        print("🏥 Component Health Report")
        print("=" * 50)
        
        print("\n🚨 Components Needing Attention (Health Score < 70):")
        problematic = [comp for comp in health_report if comp['health_score'] < 70]
        
        for comp in problematic[:10]:
            print(f"""
{comp['component_name']} (Score: {comp['health_score']}/100)
- Detachment Rate: {comp['detachment_rate']:.2%}
- Adoption Rate: {comp['adoption_rate']:.2%}
- Total Usages: {comp['total_usages']}
- Teams Using: {comp['teams_using']}
- Recent Activity: {comp['recent_insertions']} insertions, {comp['recent_detachments']} detachments
            """.strip())
        
        print(f"\n✅ Healthy Components: {len([c for c in health_report if c['health_score'] >= 70])}")
        print(f"⚠️  Components Needing Attention: {len(problematic)}")

asyncio.run(monitor_component_health("ABC123XYZ"))
```

### Library Migration Analysis

```python
async def analyze_library_migration(old_file_key: str, new_file_key: str):
    """Analyze migration between two library versions."""
    
    async with FigmaAnalyticsSDK("your-api-token") as sdk:
        print("Analyzing library migration...")
        
        # Get data for both libraries
        old_components = await sdk.get_component_usages(old_file_key, GroupBy.COMPONENT)
        new_components = await sdk.get_component_usages(new_file_key, GroupBy.COMPONENT)
        
        # Create name-based lookups
        old_lookup = {comp.component_name: comp for comp in old_components.rows}
        new_lookup = {comp.component_name: comp for comp in new_components.rows}
        
        # Analyze migration
        migrated_components = []
        missing_components = []
        new_components_list = []
        
        for name, old_comp in old_lookup.items():
            if name in new_lookup:
                new_comp = new_lookup[name]
                usage_change = new_comp.usages - old_comp.usages
                team_change = new_comp.teams_using - old_comp.teams_using
                
                migrated_components.append({
                    'name': name,
                    'old_usages': old_comp.usages,
                    'new_usages': new_comp.usages,
                    'usage_change': usage_change,
                    'old_teams': old_comp.teams_using,
                    'new_teams': new_comp.teams_using,
                    'team_change': team_change
                })
            else:
                missing_components.append({
                    'name': name,
                    'old_usages': old_comp.usages,
                    'teams_affected': old_comp.teams_using
                })
        
        # Find new components
        for name, new_comp in new_lookup.items():
            if name not in old_lookup:
                new_components_list.append({
                    'name': name,
                    'usages': new_comp.usages,
                    'teams_using': new_comp.teams_using
                })
        
        # Print migration report
        print("\n📊 Library Migration Analysis Report")
        print("=" * 50)
        
        print(f"\n✅ Successfully Migrated Components: {len(migrated_components)}")
        print(f"❌ Missing Components: {len(missing_components)}")
        print(f"🆕 New Components: {len(new_components_list)}")
        
        if missing_components:
            print("\n⚠️  Components Missing in New Library:")
            for comp in sorted(missing_components, key=lambda x: x['old_usages'], reverse=True)[:5]:
                print(f"- {comp['name']}: {comp['old_usages']} usages, {comp['teams_affected']} teams affected")
        
        if migrated_components:
            print("\n📈 Top Migration Successes (Increased Usage):")
            successful = sorted(migrated_components, key=lambda x: x['usage_change'], reverse=True)
            for comp in successful[:5]:
                if comp['usage_change'] > 0:
                    print(f"- {comp['name']}: +{comp['usage_change']} usages (+{comp['team_change']} teams)")
        
        if new_components_list:
            print("\n🆕 Most Adopted New Components:")
            for comp in sorted(new_components_list, key=lambda x: x['usages'], reverse=True)[:5]:
                print(f"- {comp['name']}: {comp['usages']} usages, {comp['teams_using']} teams")

asyncio.run(analyze_library_migration("OLD123", "NEW456"))
```

This comprehensive example collection shows how to leverage the Figma Library Analytics SDK for various use cases, from basic data retrieval to advanced analytics and monitoring workflows.