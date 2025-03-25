export interface DatabaseColumn {
	name: string;
	type: string;
	isPrimary: boolean;
	isForeign: boolean;
}

export interface DatabaseTable {
	name: string;
	columns: DatabaseColumn[];
	error?: string;
}
