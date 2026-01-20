import { fetchUtils } from 'react-admin';
import axios from 'axios';

// The new base URL for your structured API
const apiUrl = 'http://localhost:5000/api/v1'; 
const httpClient = fetchUtils.fetchJson;

// Function to handle the custom API structure
const dataProvider = {
    // 1. GET_LIST: Fetch a list of records (used in <List> views)
    getList: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        // React-Admin sends 0-indexed pages, Flask works better with limits/offsets
        const range = [(page - 1) * perPage, page * perPage - 1];

        // Construct the URL with pagination and sorting parameters
        const url = `${apiUrl}/${resource}?sort=["${field}","${order}"]&range=[${range[0]},${range[1]}]`;
        
        return httpClient(url).then(({ headers, json }) => {
            // CRITICAL: Check for the required 'Content-Range' header from your Flask app
            if (!headers.has('content-range')) {
                throw new Error(
                    'The Content-Range header is missing in the HTTP response. The Flask server must return this header.'
                );
            }
            
            // Extract the total count from the Content-Range header
            const contentRange = headers.get('content-range');
            const total = parseInt(contentRange.split('/').pop(), 10);

            return {
                data: json,
                total: total,
            };
        });
    },

    // 2. GET_ONE: Fetch a single record (used in <Edit> and <Show> views)
    getOne: (resource, params) =>
        httpClient(`${apiUrl}/${resource}/${params.id}`).then(({ json }) => ({
            data: json,
        })),
    
    // 3. GET_MANY: Fetch multiple records by ID (used for linking/displaying relationships)
    getMany: (resource, params) => {
        // Flask expects: GET /api/v1/resource?filter={"id":[123, 456, 789]}
        const query = {
            filter: JSON.stringify({ id: params.ids }),
        };
        const url = `${apiUrl}/${resource}?${fetchUtils.queryParameters(query)}`;
        return httpClient(url).then(({ json }) => ({ data: json }));
    },
    
    // 4. GET_MANY_REFERENCE: Fetch records linked to another resource (used for relationships/filters)
    getManyReference: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        
        const range = [(page - 1) * perPage, page * perPage - 1];

        // Flask expects: GET /api/v1/resource?target_field=target_id&...
        const query = {
            sort: JSON.stringify([field, order]),
            range: JSON.stringify(range),
            filter: JSON.stringify({ [params.target]: params.id }), // e.g., filter={"user_id": 1}
        };

        const url = `${apiUrl}/${resource}?${fetchUtils.queryParameters(query)}`;
        
        return httpClient(url).then(({ headers, json }) => {
            if (!headers.has('content-range')) {
                throw new Error(
                    'The Content-Range header is missing in the HTTP response for GET_MANY_REFERENCE.'
                );
            }
            
            const contentRange = headers.get('content-range');
            const total = parseInt(contentRange.split('/').pop(), 10);
            
            return {
                data: json,
                total: total,
            };
        });
    },

    // 5. CREATE: Create a new record (maps to HTTP POST)
    create: (resource, params) =>
        httpClient(`${apiUrl}/${resource}`, {
            method: 'POST',
            body: JSON.stringify(params.data),
        }).then(({ json }) => ({
            data: { ...params.data, id: json.id }, // Assume Flask returns {id: newId}
        })),

    // 6. UPDATE: Update an existing record (maps to HTTP PUT)
    update: (resource, params) =>
        httpClient(`${apiUrl}/${resource}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        }).then(({ json }) => ({ data: json })),
        
    // 7. DELETE: Delete a single record (maps to HTTP DELETE)
    delete: (resource, params) =>
        httpClient(`${apiUrl}/${resource}/${params.id}`, {
            method: 'DELETE',
        }).then(({ json }) => ({ data: json })),
        
    // 8. UPDATE_MANY: Update multiple records (using separate calls or a custom POST/PUT)
    updateMany: (resource, params) => Promise.all(
        params.ids.map(id =>
            httpClient(`${apiUrl}/${resource}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(params.data),
            })
        )
    ).then(responses => ({ data: responses.map(({ json }) => json.id) })), // Returns the list of updated IDs

    // 9. DELETE_MANY: Delete multiple records (using separate calls or a custom DELETE)
    deleteMany: (resource, params) => Promise.all(
        params.ids.map(id =>
            httpClient(`${apiUrl}/${resource}/${id}`, {
                method: 'DELETE',
            })
        )
    ).then(responses => ({ data: responses.map(({ json }) => json.id) })), // Returns the list of deleted IDs
};

export default dataProvider;
