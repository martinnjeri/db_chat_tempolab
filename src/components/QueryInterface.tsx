[0]).length === 1
				) {
					resultFormat = "value";
				}

				setResultType(resultFormat);
				setResults(data);
			} catch (queryErr: any) {
				console.error("SQL execution error:", queryErr);
				throw new Error(`Failed to execute SQL: ${queryErr.message}`);
			}
		} catch (err: any) {
			setError(
				err.message || "Failed to process query. Please try again."
			);
			console.error("Error processing query:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleTableSelect = (tableName: string) => {
		setHighlightedTable(tableName);
		// Generate a sample query for the selected table
		const sampleQuery = `Show me all ${tableName}`;
		setQuery(sampleQuery);
	};

	return (
		<div className="w-full h-full bg-background flex flex-col">
			<ResizablePanelGroup direction="horizontal" className="h-full">
				{/* Schema Explorer Panel */}
				<ResizablePanel
					defaultSize={20}
					minSize={15}
					maxSize={30}
					className="h-full">
					<SchemaExplorer
						highlightedTable={highlightedTable}
						onTableSelect={handleTableSelect}
						onTablesLoaded={setTables}
					/>
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Main Content Panel */}
				<ResizablePanel defaultSize={80} className="h-full">
					<div className="flex flex-col h-full p-4 gap-4">
						{/* Query Input Area */}
						<div className="w-full">
							<QueryInputArea
								onSubmitQuery={handleSubmitQuery}
								isProcessing={isProcessing}
							/>
						</div>

						{/* SQL Preview */}
						<div className="w-full h-[150px]">
							<SqlPreview
								sql={sql}
								isLoading={isProcessing}
								error={error || ""}
							/>
						</div>

						{/* Results Display */}
						<div className="w-full flex-1">
							<ResultsDisplay
								results={results}
								error={error}
								loading={isProcessing}
								resultType={resultType}
							/>
						</div>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
