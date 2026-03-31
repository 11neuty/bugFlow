import { IssueDetailView } from "@/components/issues/IssueDetailView";

interface IssuePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { id } = await params;

  return <IssueDetailView issueId={id} />;
}
