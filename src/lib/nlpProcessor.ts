import { DatabaseTable, DatabaseColumn } from "@/types/database";

interface QueryIntent {
  type: "select" | "count" | "group" | "filter" | "sort" | "join" | "aggregate";
  table: string;
  columns?: string[];
  conditions?: {
    field: string;
    operator: string;
    value: string | number;
  }[];
  groupBy?: string[];
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  }[];
  joins?: {
    table: string;
    condition: string;
    type: "inner" | "left" | "right" | "full";
  }[];
  limit?: number;
  offset?: number;
  aggregate?: {
    function: "count" | "sum" | "avg" | "min" | "max";
    field: string;
    alias?: string;
  }[];
}

export interface QueryExplanation {
  action: string;
  tables: string[];
  filters?: string[];
  grouping?: string[];
  sorting?: string[];
  limit?: number;
  joins?: string[];
}

export class NLPProcessor {
  private tables: DatabaseTable[];
  private tableMap: Map<string, DatabaseTable>;
  private synonyms: Map<string, string[]>;

  constructor(tables: DatabaseTable[]) {
    this.tables = tables;
    this.tableMap = new Map();
    this.synonyms = new Map();

    // Initialize table map for faster lookups
    for (const table of tables) {
      this.tableMap.set(table.name.toLowerCase(), table);
    }

    // Set up common synonyms for tables and columns
    this.setupSynonyms();
  }

  private setupSynonyms() {
    // Table synonyms
    this.synonyms.set("doctors", [
      "doctor",
      "physician",
      "specialist",
      "medical professional",
    ]);
    this.synonyms.set("patients", ["patient", "client", "person"]);
    this.synonyms.set("sample_table", ["sample", "example", "test"]);

    // Column synonyms - can be expanded based on schema
    this.synonyms.set("name", ["names", "full name", "person name"]);
    this.synonyms.set("age", ["years old", "years", "aged"]);
    this.synonyms.set("gender", ["sex", "gender identity"]);
    this.synonyms.set("specialty", ["specialization", "expertise", "field"]);
    this.synonyms.set("contact_number", [
      "phone",
      "telephone",
      "contact",
      "number",
      "phone number",
    ]);
    this.synonyms.set("email", ["e-mail", "mail", "email address"]);
  }

  private detectTable(query: string): string | null {
    const queryLower = query.toLowerCase();

    // First try direct table name matches
    for (const table of this.tables) {
      const tableName = table.name.toLowerCase();
      if (queryLower.includes(tableName)) {
        return table.name;
      }
    }

    // Then try synonyms
    for (const [tableName, synonymList] of this.synonyms.entries()) {
      if (this.tableMap.has(tableName.toLowerCase())) {
        for (const synonym of synonymList) {
          if (queryLower.includes(synonym.toLowerCase())) {
            return tableName;
          }
        }
      }
    }

    // If still no match, try to infer from column names
    for (const table of this.tables) {
      for (const column of table.columns) {
        if (queryLower.includes(column.name.toLowerCase())) {
          // If we find a column name that's somewhat unique to this table
          // (like 'specialty' for doctors), return this table
          if (column.name === "specialty" && table.name === "doctors") {
            return table.name;
          }
          if (column.name === "doctor_id" && table.name === "patients") {
            return table.name;
          }
        }
      }
    }

    return null;
  }

  private detectColumns(query: string, table: string): string[] {
    const tableSchema = this.tableMap.get(table.toLowerCase());
    if (!tableSchema) return [];

    const queryLower = query.toLowerCase();
    const columns: string[] = [];
    const columnMentions: Map<string, number> = new Map();

    // Check for specific column mentions
    for (const column of tableSchema.columns) {
      const columnName = column.name.toLowerCase();

      // Direct column name match
      if (queryLower.includes(columnName)) {
        columnMentions.set(
          column.name,
          (columnMentions.get(column.name) || 0) + 2,
        );
      }

      // Check synonyms
      const synonyms = this.synonyms.get(columnName) || [];
      for (const synonym of synonyms) {
        if (queryLower.includes(synonym.toLowerCase())) {
          columnMentions.set(
            column.name,
            (columnMentions.get(column.name) || 0) + 1,
          );
        }
      }
    }

    // Special case for "all" or "everything"
    if (queryLower.includes("all") || queryLower.includes("everything")) {
      return tableSchema.columns.map((c) => c.name);
    }

    // Check for aggregate functions
    const aggregateFunctions = ["count", "sum", "average", "avg", "min", "max"];
    for (const func of aggregateFunctions) {
      if (queryLower.includes(func)) {
        // For count(*), we don't need specific columns
        if (
          func === "count" &&
          !queryLower.includes("count of") &&
          !queryLower.includes("count by")
        ) {
          return ["COUNT(*) as count"];
        }

        // For other aggregates, look for columns to apply them to
        for (const column of tableSchema.columns) {
          if (
            queryLower.includes(`${func} of ${column.name}`) ||
            queryLower.includes(`${func} ${column.name}`)
          ) {
            const funcName = func === "average" ? "AVG" : func.toUpperCase();
            return [`${funcName}(${column.name}) as ${func}_${column.name}`];
          }
        }
      }
    }

    // Add columns that were mentioned, sorted by mention count
    const sortedColumns = Array.from(columnMentions.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    columns.push(...sortedColumns);

    // If no specific columns mentioned, return all columns
    return columns.length > 0
      ? columns
      : tableSchema.columns.map((c) => c.name);
  }

  private detectConditions(
    query: string,
    table: string,
  ): { field: string; operator: string; value: string | number }[] {
    const conditions: {
      field: string;
      operator: string;
      value: string | number;
    }[] = [];
    const tableSchema = this.tableMap.get(table.toLowerCase());
    if (!tableSchema) return conditions;

    const queryLower = query.toLowerCase();

    // Common condition patterns
    const patterns = [
      {
        regex: /(\w+)\s+(?:is|equals|equal to|=)\s+['"]?([^'"]+)['"]?/i,
        operator: "=",
      },
      {
        regex:
          /(\w+)\s+(?:greater than|more than|>|above|over)\s+['"]?([^'"]+)['"]?/i,
        operator: ">",
      },
      {
        regex:
          /(\w+)\s+(?:less than|smaller than|<|below|under)\s+['"]?([^'"]+)['"]?/i,
        operator: "<",
      },
      {
        regex: /(\w+)\s+(?:contains|has|like|includes)\s+['"]?([^'"]+)['"]?/i,
        operator: "LIKE",
      },
      {
        regex: /(\w+)\s+(?:not equal to|!=|not)\s+['"]?([^'"]+)['"]?/i,
        operator: "!=",
      },
      {
        regex: /(\w+)\s+(?:greater than or equal to|>=)\s+['"]?([^'"]+)['"]?/i,
        operator: ">=",
      },
      {
        regex: /(\w+)\s+(?:less than or equal to|<=)\s+['"]?([^'"]+)['"]?/i,
        operator: "<=",
      },
    ];

    // Check for each pattern
    for (const pattern of patterns) {
      const matches = queryLower.match(pattern.regex);
      if (matches) {
        const [, field, value] = matches;

        // Check if the field exists in the table
        const columnExists = tableSchema.columns.some(
          (c) => c.name.toLowerCase() === field.toLowerCase(),
        );

        if (columnExists) {
          // Try to convert to number if appropriate
          let processedValue: string | number = value.trim();
          if (!isNaN(Number(processedValue)) && processedValue !== "") {
            processedValue = Number(processedValue);
          } else if (pattern.operator === "LIKE") {
            processedValue = `%${processedValue}%`;
          }

          conditions.push({
            field,
            operator: pattern.operator,
            value: processedValue,
          });
        }
      }
    }

    // Special case for gender
    if (table === "patients" && queryLower.includes("gender")) {
      if (
        queryLower.includes("male") &&
        !conditions.some((c) => c.field === "gender")
      ) {
        conditions.push({
          field: "gender",
          operator: "=",
          value: "male",
        });
      } else if (
        queryLower.includes("female") &&
        !conditions.some((c) => c.field === "gender")
      ) {
        conditions.push({
          field: "gender",
          operator: "=",
          value: "female",
        });
      }
    }

    return conditions;
  }

  private detectGrouping(query: string, table: string): string[] {
    const groupBy: string[] = [];
    const tableSchema = this.tableMap.get(table.toLowerCase());
    if (!tableSchema) return groupBy;

    const queryLower = query.toLowerCase();

    // Check for explicit group by phrases
    const groupPhrases = [
      "group by",
      "grouped by",
      "group according to",
      "categorize by",
    ];
    const hasGrouping = groupPhrases.some((phrase) =>
      queryLower.includes(phrase),
    );

    // Also detect implicit grouping with aggregate functions
    const hasAggregation = [
      "count",
      "sum",
      "average",
      "avg",
      "min",
      "max",
    ].some((func) => queryLower.includes(func));

    if (hasGrouping || hasAggregation) {
      // Look for columns to group by
      for (const column of tableSchema.columns) {
        const columnName = column.name.toLowerCase();

        // Check for direct mentions
        if (queryLower.includes(columnName)) {
          // For grouping, we need to check if the column is mentioned in context of grouping
          for (const phrase of groupPhrases) {
            if (
              queryLower.includes(`${phrase} ${columnName}`) ||
              queryLower.includes(`${columnName} ${phrase.replace("by", "")}`)
            ) {
              groupBy.push(column.name);
              break;
            }
          }

          // Special case for "count by" or "group patients by gender"
          if (
            queryLower.includes(`count by ${columnName}`) ||
            queryLower.includes(`count of ${columnName}`) ||
            queryLower.includes(`group ${table} by ${columnName}`)
          ) {
            groupBy.push(column.name);
          }
        }
      }
    }

    // Special case for gender grouping
    if (
      table === "patients" &&
      (queryLower.includes("by gender") ||
        queryLower.includes("gender distribution"))
    ) {
      groupBy.push("gender");
    }

    return groupBy;
  }

  private detectSorting(
    query: string,
    table: string,
  ): { field: string; direction: "asc" | "desc" }[] {
    const orderBy: { field: string; direction: "asc" | "desc" }[] = [];
    const tableSchema = this.tableMap.get(table.toLowerCase());
    if (!tableSchema) return orderBy;

    const queryLower = query.toLowerCase();

    // Check for sorting phrases
    const sortPhrases = [
      { phrase: "sort by", direction: "asc" },
      { phrase: "order by", direction: "asc" },
      { phrase: "sorted by", direction: "asc" },
      { phrase: "arranged by", direction: "asc" },
      { phrase: "in ascending order", direction: "asc" },
      { phrase: "in descending order", direction: "desc" },
      { phrase: "from highest to lowest", direction: "desc" },
      { phrase: "from lowest to highest", direction: "asc" },
    ];

    // Check if any sort phrase exists
    const hasSorting = sortPhrases.some(({ phrase }) =>
      queryLower.includes(phrase),
    );

    if (hasSorting) {
      // Determine the default direction
      let defaultDirection: "asc" | "desc" = "asc";
      for (const { phrase, direction } of sortPhrases) {
        if (queryLower.includes(phrase)) {
          defaultDirection = direction;
          break;
        }
      }

      // Override with explicit direction if present
      if (
        queryLower.includes("desc") ||
        queryLower.includes("descending") ||
        queryLower.includes("highest to lowest")
      ) {
        defaultDirection = "desc";
      } else if (
        queryLower.includes("asc") ||
        queryLower.includes("ascending") ||
        queryLower.includes("lowest to highest")
      ) {
        defaultDirection = "asc";
      }

      // Look for columns to sort by
      for (const column of tableSchema.columns) {
        const columnName = column.name.toLowerCase();

        // Check for direct mentions in sorting context
        for (const { phrase } of sortPhrases) {
          if (queryLower.includes(`${phrase} ${columnName}`)) {
            orderBy.push({
              field: column.name,
              direction: defaultDirection,
            });
            break;
          }
        }
      }
    }

    // Special cases for common sorting patterns
    if (table === "patients") {
      // Sort by age
      if (queryLower.includes("oldest") || queryLower.includes("elder")) {
        orderBy.push({ field: "age", direction: "desc" });
      } else if (
        queryLower.includes("youngest") ||
        queryLower.includes("young")
      ) {
        orderBy.push({ field: "age", direction: "asc" });
      }
    }

    return orderBy;
  }

  private detectLimit(query: string): number | undefined {
    const queryLower = query.toLowerCase();

    // Look for limit patterns
    const limitPatterns = [
      /\btop (\d+)\b/i,
      /\bfirst (\d+)\b/i,
      /\blimit (\d+)\b/i,
      /\b(\d+) results\b/i,
      /\bshow (\d+)\b/i,
      /\bonly (\d+)\b/i,
    ];

    for (const pattern of limitPatterns) {
      const match = queryLower.match(pattern);
      if (match && match[1]) {
        const limit = parseInt(match[1], 10);
        if (!isNaN(limit) && limit > 0) {
          return limit;
        }
      }
    }

    // Default limit for safety
    return 100;
  }

  private detectJoins(
    query: string,
    mainTable: string,
  ): {
    table: string;
    condition: string;
    type: "inner" | "left" | "right" | "full";
  }[] {
    const joins: {
      table: string;
      condition: string;
      type: "inner" | "left" | "right" | "full";
    }[] = [];

    const queryLower = query.toLowerCase();
    const mainTableSchema = this.tableMap.get(mainTable.toLowerCase());
    if (!mainTableSchema) return joins;

    // Check if query mentions multiple tables
    const mentionedTables = new Set<string>();
    mentionedTables.add(mainTable.toLowerCase());

    // Find other tables mentioned in the query
    for (const table of this.tables) {
      if (
        table.name.toLowerCase() !== mainTable.toLowerCase() &&
        queryLower.includes(table.name.toLowerCase())
      ) {
        mentionedTables.add(table.name.toLowerCase());
      }
    }

    // If multiple tables are mentioned, try to find relationships
    if (mentionedTables.size > 1) {
      for (const tableName of mentionedTables) {
        if (tableName === mainTable.toLowerCase()) continue;

        const joinTable = this.tableMap.get(tableName);
        if (!joinTable) continue;

        // Look for foreign key relationships
        let joinCondition = "";
        let joinType: "inner" | "left" | "right" | "full" = "inner";

        // Check main table columns for foreign keys to join table
        for (const column of mainTableSchema.columns) {
          if (
            column.isForeign &&
            column.name.includes(tableName.replace("s", "_id"))
          ) {
            joinCondition = `${mainTable}.${column.name} = ${joinTable.name}.id`;
            break;
          }
        }

        // Check join table columns for foreign keys to main table
        if (!joinCondition) {
          for (const column of joinTable.columns) {
            if (
              column.isForeign &&
              column.name.includes(mainTable.replace("s", "_id"))
            ) {
              joinCondition = `${joinTable.name}.${column.name} = ${mainTable}.id`;
              break;
            }
          }
        }

        // If we found a join condition, add it
        if (joinCondition) {
          // Determine join type from query
          if (
            queryLower.includes("left join") ||
            queryLower.includes("including all")
          ) {
            joinType = "left";
          } else if (queryLower.includes("right join")) {
            joinType = "right";
          } else if (
            queryLower.includes("full join") ||
            queryLower.includes("all records")
          ) {
            joinType = "full";
          }

          joins.push({
            table: joinTable.name,
            condition: joinCondition,
            type: joinType,
          });
        }
      }
    }

    // Special case for doctors and patients
    if (mainTable === "patients" && queryLower.includes("doctor")) {
      joins.push({
        table: "doctors",
        condition: "patients.doctor_id = doctors.id",
        type: "left",
      });
    } else if (mainTable === "doctors" && queryLower.includes("patient")) {
      joins.push({
        table: "patients",
        condition: "patients.doctor_id = doctors.id",
        type: "left",
      });
    }

    return joins;
  }

  private generateSQL(intent: QueryIntent): string {
    let sql = "";

    // Handle COUNT queries specially
    if (intent.type === "count" && !intent.groupBy?.length) {
      sql = `SELECT COUNT(*) as count FROM ${intent.table}`;
    } else {
      // Start with SELECT
      sql = "SELECT ";

      // Add columns or aggregates
      if (intent.aggregate && intent.aggregate.length > 0) {
        const aggregateCols = intent.aggregate.map((agg) => {
          const alias = agg.alias || `${agg.function}_${agg.field}`;
          return `${agg.function.toUpperCase()}(${agg.field}) as ${alias}`;
        });

        // If we have grouping, add those columns too
        if (intent.groupBy && intent.groupBy.length > 0) {
          sql += [...intent.groupBy, ...aggregateCols].join(", ");
        } else {
          sql += aggregateCols.join(", ");
        }
      } else if (intent.columns && intent.columns.length > 0) {
        sql += intent.columns.join(", ");
      } else {
        sql += "*";
      }

      // Add FROM clause
      sql += ` FROM ${intent.table}`;
    }

    // Add JOINs if any
    if (intent.joins && intent.joins.length > 0) {
      for (const join of intent.joins) {
        sql += ` ${join.type.toUpperCase()} JOIN ${join.table} ON ${join.condition}`;
      }
    }

    // Add WHERE conditions
    if (intent.conditions && intent.conditions.length > 0) {
      sql +=
        " WHERE " +
        intent.conditions
          .map(
            (condition) =>
              `${condition.field} ${condition.operator} ${
                typeof condition.value === "string"
                  ? `'${condition.value}'`
                  : condition.value
              }`,
          )
          .join(" AND ");
    }

    // Add GROUP BY
    if (intent.groupBy && intent.groupBy.length > 0) {
      sql += " GROUP BY " + intent.groupBy.join(", ");
    }

    // Add ORDER BY
    if (intent.orderBy && intent.orderBy.length > 0) {
      sql +=
        " ORDER BY " +
        intent.orderBy
          .map((order) => `${order.field} ${order.direction.toUpperCase()}`)
          .join(", ");
    }

    // Add LIMIT
    if (intent.limit) {
      sql += ` LIMIT ${intent.limit}`;
    }

    // Add OFFSET
    if (intent.offset) {
      sql += ` OFFSET ${intent.offset}`;
    }

    return sql + ";";
  }

  public processQuery(query: string): string {
    // Detect query intent
    const intent: QueryIntent = {
      type: "select",
      table: "",
      columns: [],
      conditions: [],
      groupBy: [],
      orderBy: [],
      joins: [],
      limit: this.detectLimit(query),
    };

    // Handle special case for listing tables
    const queryLower = query.toLowerCase();
    if (
      queryLower.includes("list tables") ||
      queryLower.includes("show tables") ||
      queryLower.includes("all tables")
    ) {
      return `
				SELECT 
					table_name as name,
					(SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
				FROM 
					information_schema.tables t
				WHERE 
					table_schema = 'public' AND 
					table_type = 'BASE TABLE'
				ORDER BY 
					table_name;
			`;
    }

    // Detect table
    const table = this.detectTable(query);
    if (!table) {
      throw new Error(
        "Could not detect table from query. Try mentioning a specific table like 'doctors', 'patients', or 'sample_table'.",
      );
    }
    intent.table = table;

    // Detect if this is a count query
    if (queryLower.includes("count") || queryLower.includes("how many")) {
      intent.type = "count";

      // Check if we're counting by a specific column
      const groupBy = this.detectGrouping(query, table);
      if (groupBy.length > 0) {
        intent.groupBy = groupBy;
        intent.aggregate = [
          {
            function: "count",
            field: "*",
            alias: "count",
          },
        ];
        intent.columns = undefined; // We'll generate columns from groupBy and aggregate
      }
    } else if (queryLower.includes("average") || queryLower.includes("avg")) {
      intent.type = "aggregate";
      // Find which column to average
      const tableSchema = this.tableMap.get(table.toLowerCase());
      if (tableSchema) {
        for (const column of tableSchema.columns) {
          if (
            queryLower.includes(`average ${column.name}`) ||
            queryLower.includes(`avg ${column.name}`)
          ) {
            intent.aggregate = [
              {
                function: "avg",
                field: column.name,
                alias: `avg_${column.name}`,
              },
            ];
            break;
          }
        }
      }
    }

    // Detect columns (if not a special query type)
    if (!intent.aggregate) {
      intent.columns = this.detectColumns(query, table);
    }

    // Detect conditions
    intent.conditions = this.detectConditions(query, table);

    // Detect grouping (if not already set)
    if (!intent.groupBy || intent.groupBy.length === 0) {
      intent.groupBy = this.detectGrouping(query, table);
    }

    // Detect sorting
    intent.orderBy = this.detectSorting(query, table);

    // Detect joins
    intent.joins = this.detectJoins(query, table);

    // Generate SQL
    return this.generateSQL(intent);
  }

  // Generate a natural language explanation of the SQL query
  public explainQuery(query: string): QueryExplanation {
    const explanation: QueryExplanation = {
      action: "retrieve data",
      tables: [],
    };

    try {
      // Detect table
      const table = this.detectTable(query);
      if (table) {
        explanation.tables.push(table);

        // Detect if this is a count query
        const queryLower = query.toLowerCase();
        if (queryLower.includes("count") || queryLower.includes("how many")) {
          explanation.action = "count";
        } else if (
          queryLower.includes("average") ||
          queryLower.includes("avg")
        ) {
          explanation.action = "calculate average";
        }

        // Detect conditions
        const conditions = this.detectConditions(query, table);
        if (conditions.length > 0) {
          explanation.filters = conditions.map(
            (c) =>
              `${c.field} ${c.operator} ${typeof c.value === "string" ? `'${c.value}'` : c.value}`,
          );
        }

        // Detect grouping
        const groupBy = this.detectGrouping(query, table);
        if (groupBy.length > 0) {
          explanation.grouping = groupBy;
        }

        // Detect sorting
        const orderBy = this.detectSorting(query, table);
        if (orderBy.length > 0) {
          explanation.sorting = orderBy.map((o) => `${o.field} ${o.direction}`);
        }

        // Detect limit
        const limit = this.detectLimit(query);
        if (limit) {
          explanation.limit = limit;
        }

        // Detect joins
        const joins = this.detectJoins(query, table);
        if (joins.length > 0) {
          // Add joined tables to the tables list
          joins.forEach((join) => {
            if (!explanation.tables.includes(join.table)) {
              explanation.tables.push(join.table);
            }
          });

          explanation.joins = joins.map(
            (j) => `${j.type} join with ${j.table} on ${j.condition}`,
          );
        }
      }
    } catch (error) {
      // If we can't parse the query, return a basic explanation
      explanation.action = "unknown query";
    }

    return explanation;
  }
}
