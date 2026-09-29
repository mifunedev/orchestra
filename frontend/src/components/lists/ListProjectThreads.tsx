interface ListProjectThreadsProps {
	projectId: string;
}

function ListProjectThreads({
	projectId: _projectId,
}: ListProjectThreadsProps) {
	return (
		<div className="flex justify-center items-center py-8">
			<p className="text-muted-foreground">
				Project conversations are unavailable in this experiment.
			</p>
		</div>
	);
}

export default ListProjectThreads;
