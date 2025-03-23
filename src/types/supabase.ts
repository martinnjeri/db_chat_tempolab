export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Define your tables here once you have the schema
      // This is a placeholder that will be updated once you connect to Supabase
    };
    Functions: {
      execute_query: {
        Args: {
          query_text: string;
        };
        Returns: Json[];
      };
      get_tables: {
        Args: Record<string, never>;
        Returns: {
          name: string;
          columns: {
            name: string;
            type: string;
            isPrimary: boolean;
            isForeign: boolean;
          }[];
        }[];
      };
      get_table_schema: {
        Args: {
          table_name: string;
        };
        Returns: {
          name: string;
          type: string;
          isPrimary: boolean;
          isForeign: boolean;
        }[];
      };
    };
  };
}
