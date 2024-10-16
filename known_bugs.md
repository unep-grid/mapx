1.	String vs Array in DB and List vs Vector in R
	
	•	Description:
When retrieving JSON data from PostgreSQL, jsonlite::fromJSON incorrectly simplifies arrays with a single element into scalar values or converts scalars into arrays. This results in inconsistent data structures, particularly when handling nested or mixed types (e.g., arrays, objects).
	
	•	Impact:
Many jsonb PostgreSQL queries need to account for both arrays and strings when an item has been saved in R. All data returned by MapX editor, validated by a JSON schema, is always correct.

2.	jsonlite Converts NULL to {}
	
	•	Description:
jsonlite::toJSON(NULL) results in {}, which can introduce potential bugs in the application. Some fixes have been implemented to address this. Similarly, toJSON(NA) results in [null]. While auto_unbox is useful, it can cause issues where an array is expected in JSON.
