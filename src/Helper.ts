import mysql from "mysql";
import fs from "fs";

import path from "path";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export class Helper {
	etimap = new Map<string, Map<number, Map<string, string>>>();
	itemap = new Map<string, Map<number, Map<string, string>>>();
	private internalId: number = 0;
	private sqlConnection?: mysql.Connection;
	constructor(
		sqlconnection: void | {host: string; user: string; password: string; database: string},
	) {
		if (sqlconnection) {
			if (!fs.existsSync("internalstore.json")) {
				fs.writeFileSync("internalstore.json", "0");
			} else {
				this.internalId = +fs.readFileSync(__dirname + "/../internalstore.json");
			}
			//console.log(this.internalId);
			const con = mysql.createConnection(sqlconnection);
			con.connect(() => {
				console.log("sql connected");
				this.sqlConnection = con;
				const sql =
					"CREATE TABLE IF NOT EXISTS datamap (eid VARCHAR(128), uuid DOUBLE(25,5), iid VARCHAR(16), name VARCHAR(64));";
				con.query(sql, function (err) {
					if (err) throw err;
					//console.log("Table created");
				});
			});
		}
		//stuff will go here
	}
	async convertExternalToInternalSQL(name: string, uuid: number | void, id: string | null) {
		return new Promise<string | null>((res) => {
			if (!this.sqlConnection) throw new Error("that's not good!");

			this.sqlConnection.query(
				`SELECT iid FROM datamap WHERE name=? AND uuid=? AND eid=?;`,
				[name, uuid, id],
				function (err, result) {
					if (err) throw err;
					if (result.length === 0) {
						res(null);
					} else {
						res(result[0].iid);
					}
				},
			);
			console.log("in here");
		});
	}
	async convertExternalToInternal(name: string, uuid: number | void, id: string | null) {
		if (this.sqlConnection) {
			return this.convertExternalToInternalSQL(name, uuid, id);
		}
		if (!id || !uuid) return null;
		const m = this.etimap.get(name);
		if (!m) return null;
		const uid = m.get(uuid);
		if (!uid) return null;
		const iid = uid.get(id);
		if (!iid) return null;
		return iid;
	}
	async convertInternalToExternalSQL(name: string, uuid: number | void, id: string | null) {
		if (!id || !uuid) {
			//console.log("nully", id, uuid);
			return null;
		}
		return await new Promise<string | null>((res) => {
			if (!this.sqlConnection) throw new Error("that's not good!");
			console.log("not", id, uuid, name);
			this.sqlConnection.query(
				`SELECT eid FROM datamap WHERE name=? AND uuid=? AND iid=?`,
				[name, uuid, id],
				function (err, result) {
					console.log("done");
					if (err) throw err;
					console.log(result);
					if (result.length == 0) {
						res(null);
						return;
					}
					res(result[0].eid as string);
				},
			);
		});
		//return null;
	}
	async convertInternalToExternal(name: string, uuid: number | void, id: string | null) {
		if (this.sqlConnection) {
			//console.log("sql", id);
			return this.convertInternalToExternalSQL(name, uuid, id);
		}
		//console.log("not sql");
		if (!id || !uuid) return null;
		const m = this.itemap.get(name);
		if (!m) return null;
		const uid = m.get(uuid);
		if (!uid) return null;
		const iid = uid.get(id);
		if (!iid) return null;
		return iid;
	}
	createNewMessage(name: string, uuid: number, id: string) {
		this.internalId++;
		//console.log(this.internalId);
		fs.writeFileSync("internalstore.json", `${this.internalId}`);
		try {
			this.setEIDtoIID(name, uuid, id, this.internalId + "");
		} catch (e) {
			console.error(e);
		}
		return this.internalId + "";
	}
	setEIDtoIIDSQL(name: string, uuid: number | void, eid: string, iid: string) {
		//console.log(eid);
		if (this.sqlConnection) {
			this.sqlConnection.query(`INSERT INTO datamap (eid, uuid, iid, name) VALUES (?, ?, ?, ?);`, [
				eid,
				uuid,
				iid,
				name,
			]);
		}
	}
	async deleteIID(iid: string) {
		return new Promise<void>((res) => {
			if (!this.sqlConnection) throw new Error("that's not good!");
			this.sqlConnection.query(`DELETE FROM datamap WHERE iid=?`, [iid], function (err) {
				if (err) {
					throw err;
				}
				res();
			});
		});
	}
	setEIDtoIID(name: string, uuid: number | void, eid: string, iid: string) {
		if (this.sqlConnection) {
			return this.setEIDtoIIDSQL(name, uuid, eid, iid);
		}
		//console.log("in", uuid);
		if (uuid == void 0) {
			throw new Error("trace");
			return;
		}
		let ueti = this.etimap.get(name);
		let uite = this.itemap.get(name);
		if (!ueti || !uite) {
			ueti = new Map();
			this.etimap.set(name, ueti);
			uite = new Map();
			this.itemap.set(name, uite);
		}
		let eti = ueti.get(uuid);
		let ite = uite.get(uuid);
		if (!eti || !ite) {
			eti = new Map();
			ueti.set(uuid, eti);
			ite = new Map();
			uite.set(uuid, ite);
		}
		eti.set(eid, iid);
		ite.set(iid, eid);
		//console.log(this.etimap);
	}
}
