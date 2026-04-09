import { prisma } from "@/lib/prisma";
import {
  badRequest,
  conflict,
  notFound,
} from "@/lib/errors";
import { assertCanManageIssueRelations } from "@/lib/permissions";
import type { AuthUser, IssueRelationRecord } from "@/lib/types";
import { requireProjectMembership } from "@/services/project-members-service";
import {
  issueRelationInclude,
  serializeIssueRelation,
} from "@/services/serializers";
import { ISSUE_RELATION_LIMIT } from "@/lib/constants";

const SYMMETRIC_RELATION_TYPES = new Set(["RELATES_TO", "DUPLICATES"]);

async function getActiveIssue(issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      deletedAt: null,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!issue) {
    throw notFound("Issue not found.");
  }

  return issue;
}

export async function listIssueRelations(
  user: AuthUser,
  issueId: string,
): Promise<IssueRelationRecord[]> {
  const issue = await getActiveIssue(issueId);
  await requireProjectMembership(prisma, user.id, issue.projectId);

  const relations = await prisma.issueRelation.findMany({
    where: {
      OR: [{ sourceIssueId: issueId }, { targetIssueId: issueId }],
      sourceIssue: {
        deletedAt: null,
      },
      targetIssue: {
        deletedAt: null,
      },
    },
    include: issueRelationInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: ISSUE_RELATION_LIMIT,
  });

  return relations.map((relation) => serializeIssueRelation(relation, issueId));
}

export async function createIssueRelation(
  user: AuthUser,
  issueId: string,
  input: {
    targetIssueId: string;
    type: "BLOCKS" | "RELATES_TO" | "DUPLICATES";
  },
) {
  if (issueId === input.targetIssueId) {
    throw badRequest("An issue cannot relate to itself.");
  }

  const sourceIssue = await getActiveIssue(issueId);
  const membership = await requireProjectMembership(prisma, user.id, sourceIssue.projectId);
  assertCanManageIssueRelations(membership.role);

  const targetIssue = await getActiveIssue(input.targetIssueId);

  if (sourceIssue.projectId !== targetIssue.projectId) {
    throw badRequest("Issue relations must stay inside the same project.");
  }

  const duplicateRelation = await prisma.issueRelation.findFirst({
    where: SYMMETRIC_RELATION_TYPES.has(input.type)
      ? {
          type: input.type,
          OR: [
            {
              sourceIssueId: sourceIssue.id,
              targetIssueId: targetIssue.id,
            },
            {
              sourceIssueId: targetIssue.id,
              targetIssueId: sourceIssue.id,
            },
          ],
        }
      : {
          sourceIssueId: sourceIssue.id,
          targetIssueId: targetIssue.id,
          type: input.type,
        },
    select: {
      id: true,
    },
  });

  if (duplicateRelation) {
    throw conflict("That relation already exists.");
  }

  const relation = await prisma.issueRelation.create({
    data: {
      sourceIssueId: sourceIssue.id,
      targetIssueId: targetIssue.id,
      type: input.type,
    },
    include: issueRelationInclude,
  });

  return {
    relation: serializeIssueRelation(relation, issueId),
  };
}

export async function deleteIssueRelation(
  user: AuthUser,
  issueId: string,
  relationId: string,
) {
  const issue = await getActiveIssue(issueId);
  const membership = await requireProjectMembership(prisma, user.id, issue.projectId);
  assertCanManageIssueRelations(membership.role);

  const relation = await prisma.issueRelation.findFirst({
    where: {
      id: relationId,
      OR: [{ sourceIssueId: issueId }, { targetIssueId: issueId }],
    },
    select: {
      id: true,
    },
  });

  if (!relation) {
    throw notFound("Issue relation not found.");
  }

  await prisma.issueRelation.delete({
    where: {
      id: relationId,
    },
  });

  return {
    deleted: true,
  };
}
