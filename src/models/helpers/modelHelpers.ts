import { Model } from "sequelize-typescript";
import { SyncOptions } from "sequelize";
import sequelize from "../sequelize";

//it is a decorator, that return hook runner
export const addFKIfNotExistToModel = <SArrt extends {}, DAttr extends {}>(
  tableModel: typeof Model<any, SArrt>,
  referencedModel: typeof Model<any, DAttr>,
  fk: [keyof SArrt & string, keyof DAttr & string][]
) =>
  async function (opt: SyncOptions): Promise<void> {
    const tblNameObj = tableModel.getTableName();
    const tblName =
      typeof tblNameObj === "string" ? tblNameObj : tblNameObj.tableName;

    const refNameObj = referencedModel.getTableName();
    const refName =
      typeof refNameObj === "string" ? refNameObj : refNameObj.tableName;

    let queryInterface = sequelize.getQueryInterface();

    const tblCols = fk.map((pair) => pair[0]).join("_");
    const constraintName = `${tblName}_${refName}_${tblCols}`;
    const fkRef = (
      (await queryInterface.getForeignKeyReferencesForTable(tblName)) as any[]
    ).map((fk) => fk.constraintName);

    //create if constraint name not there
    if (fkRef.every((fkName) => fkName !== constraintName)) {
      const tblColsList = fk.map((pair) => `\`${pair[0]}\``).join(", ");
      const refColsList = fk.map((pair) => `\`${pair[1]}\``).join(", ");
      const query = `ALTER TABLE \`${tblName}\` 
          ADD CONSTRAINT ${constraintName} 
          FOREIGN KEY (${tblColsList}) REFERENCES \`${refName}\` (${refColsList}) 
          ON UPDATE CASCADE
          ON DELETE CASCADE;`;
      queryInterface.sequelize.query(query);
    }
  };
