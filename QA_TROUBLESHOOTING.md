# Q&A Module Troubleshooting Guide

## Console Errors and Solutions

### 1. 404 Error: `supabase.beaienergy.com/rest/v1/QA_PENDIENTE`

**Problem**: The `QA_PENDIENTE` table doesn't exist in Supabase or permissions are missing.

**Solution**:
1. Run the SQL script `setup_qa_table.sql` in your Supabase SQL editor
2. Verify the table was created by checking the Supabase dashboard
3. Ensure your Supabase credentials are correctly configured in `.env.local`:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. 500 Error: `n8n.beaienergy.com/webhook-test/qa-audit-generator`

**Problem**: The n8n workflow is failing with an internal server error.

**Solution**:
1. Check the n8n workflow execution logs
2. Verify the workflow `qa-audit-generator` is active and properly configured
3. Ensure all required nodes are connected and configured
4. Check if the AI services are accessible from n8n

### 3. JSON Parsing Error: "Unexpected end of JSON input"

**Problem**: The n8n webhook is returning an empty or malformed response.

**Solution**:
1. The workflow might be failing silently - check n8n execution history
2. Verify the webhook returns proper JSON structure
3. Check if there are timeout issues in the workflow

## Implementation Improvements Made

### Enhanced Error Handling

1. **useQAStore.ts**:
   - Better error messages for 404/table not found errors
   - Graceful fallback when Supabase is not configured
   - Detailed logging for debugging

2. **n8n.service.ts**:
   - Improved JSON parsing with validation
   - Better error messages for 500 errors
   - Response validation before JSON parsing
   - Enhanced logging for debugging

## Quick Fix Steps

1. **Create the QA table**:
   ```sql
   -- Run in Supabase SQL editor
   -- See setup_qa_table.sql
   ```

2. **Check environment variables**:
   ```bash
   # In .env.local
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Verify n8n workflow**:
   - Go to n8n.beaienergy.com
   - Check `qa-audit-generator` workflow
   - Review execution history for errors

4. **Test the fixes**:
   - Refresh the application
   - Try generating a technical audit
   - Check console for improved error messages

## Development vs Production

### Development Environment
- Uses proxy configuration
- More detailed error messages
- Development-specific endpoints

### Production Environment
- Uses direct n8n URLs
- User-friendly error messages
- Production-ready error handling

## Monitoring

After implementing the fixes:
1. Monitor console logs for any remaining errors
2. Check Supabase for successful data creation
3. Verify n8n workflow executions complete successfully
4. Test the complete Q&A generation flow

## Support

If issues persist:
1. Check the browser console for detailed error messages
2. Review n8n execution logs
3. Verify Supabase table permissions
4. Ensure all environment variables are correctly set
