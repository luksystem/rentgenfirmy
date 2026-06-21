export const KANBAN_HUB_NO_CLIENT_ID = "__none__";

export type KanbanHubClientTile = {
  clientId: string;
  clientName: string;
  projectCount: number;
  boardCount: number;
  openTaskCount: number;
  newTaskCount: number;
};

export type KanbanHubBoardEntry = {
  boardId: string;
  projectProcessItemId: string;
  projectId: string;
  clientId: string;
  projectName: string;
  projectType: string;
  templateItemId: string;
  openTaskCount: number;
  newTaskCount: number;
};
