import { DEFAULT_SYSTEM_PROMPT } from "@/lib/config/instruction";
import { ThreadPayload } from "@/lib/entities";

// const API_TOOL = {
// 	"description": "Airtable Tools",
// 	"headers": {
// 		"x-api-key": "0123456789"
// 	},
// 	"name": "Airtable Tools",
// 	"spec": {
// 		"info": {
// 			"description": "Unified webhook endpoint with tool-specific actions based on `event`",
// 			"title": "Airtable Tools",
// 			"version": "v1.0.0"
// 		},
// 		"openapi": "3.1.0",
// 		"paths": {
// 			"/webhook/airtable": {
// 				"post": {
// 					"deprecated": false,
// 					"operationId": "airtable_list_bases",
// 					"requestBody": {
// 						"content": {
// 							"application/json": {
// 								"schema": {
// 									"properties": {
// 										"event": {
// 											"enum": ["airtable_list_bases"],
// 											"type": "string"
// 										},
// 										"data": {
// 											"type": "object"
// 										}
// 									},
// 									"required": [
// 										"event",
// 										"data"
// 									],
// 									"type": "object"
// 								}
// 							}
// 						},
// 						"required": true
// 					},
// 					"responses": {
// 						"200": {
// 							"description": "List of bases"
// 						}
// 					}
// 				}
// 			},
// 			"/webhook/airtable#schema": {
// 				"post": {
// 					"deprecated": false,
// 					"operationId": "airtable_get_base_schema",
// 					"requestBody": {
// 						"content": {
// 							"application/json": {
// 								"schema": {
// 									"properties": {
// 										"event": {
// 											"enum": ["airtable_get_base_schema"],
// 											"type": "string"
// 										},
// 										"data": {
// 											"properties": {
// 												"baseId": {
// 													"type": "string"
// 												}
// 											},
// 											"required": [
// 												"baseId"
// 											],
// 											"type": "object"
// 										}
// 									},
// 									"required": [
// 										"event",
// 										"data"
// 									],
// 									"type": "object"
// 								}
// 							}
// 						},
// 						"required": true
// 					},
// 					"responses": {
// 						"200": {
// 							"description": "Schema retrieved"
// 						}
// 					}
// 				}
// 			},
// 			"/webhook/airtable#search": {
// 				"post": {
// 					"deprecated": false,
// 					"operationId": "airtable_search_records",
// 					"requestBody": {
// 						"content": {
// 							"application/json": {
// 								"schema": {
// 									"properties": {
// 										"event": {
// 											"enum": ["airtable_search_records"],
// 											"type": "string"
// 										},
// 										"data": {
// 											"properties": {

// 												"baseId": {
// 													"type": "string"
// 												},
// 												"tableId": {
// 													"type": "string"
// 												},
// 												"filterByFormula": {
// 													"type": "string"
// 												},
// 												"outputFields": {
// 													"description": "List of field names to include in the response",
// 													"items": {
// 														"type": "string"
// 													},
// 													"type": "array"
// 												},
// 												"sort": {
// 													"properties": {
// 														"field": {
// 															"type": "string"
// 														},
// 														"direction": {
// 															"enum": [
// 																"ASC",
// 																"DESC"
// 															],
// 															"type": "string"
// 														}
// 													},
// 													"type": "object"
// 												}
// 											},
// 											"required": [
// 												"baseId",
// 												"tableId"
// 											],
// 											"type": "object"
// 										}
// 									},
// 									"required": [
// 										"event",
// 										"data"
// 									],
// 									"type": "object"
// 								}
// 							}
// 						},
// 						"required": true
// 					},
// 					"responses": {
// 						"200": {
// 							"description": "Matching records returned"
// 						}
// 					}
// 				}
// 			}
// 		},
// 		"servers": [
// 			{
// 				"url": "https://n8n.mifune.dev"
// 			}
// 		]
// 	}
// }

export function constructSystemPrompt(systemPrompt: string) {
	return `${systemPrompt}
---
Current Date and Time: ${new Date().toLocaleString()}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
Language: ${navigator.language}
`;
}

export const constructPayload = (payload: ThreadPayload, agentId?: string) => {
	// payload.tools?.push(API_TOOL);

	return agentId
		? {
				query: payload.query,
			}
		: {
				...payload,
				// collection: {
				// 	id: "c904646f-c872-43ba-96d6-05492efc6015",
				// 	limit: 10,
				// 	filter: {}
				// },
				system: payload.system
					? constructSystemPrompt(payload.system)
					: DEFAULT_SYSTEM_PROMPT,
			};
};
