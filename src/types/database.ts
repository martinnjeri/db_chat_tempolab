export interface DatabaseColumn {
	name: string;
	type: string;
	isPrimaryKey?: boolean;
	isNullable?: boolean;
	description?: string;
}

export interface DatabaseTable {
	name: string;
	columns: DatabaseColumn[];
	foreignKeys?: {
		column: string;
		foreignTable: string;
		foreignColumn: string;
	}[];
	error?: string;
}
