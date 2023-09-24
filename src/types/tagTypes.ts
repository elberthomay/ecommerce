import Tag from "../models/Tag";

export interface TagQueryType {
  tagId: Tag["id"];
}

export interface TagCreateType {
  name: Tag["name"];
}

export interface TagPatchType {
  name?: Tag["name"];
}
