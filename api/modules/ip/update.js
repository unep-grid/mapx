import {settings} from '#root/settings';
import {promisify} from 'util';
import {pipeline} from 'stream';
import {pgAdmin, pgWrite} from '#mapx/db';
import {parseTemplate} from '#mapx/helpers';
import pkgPgCopyStream from 'pg-copy-streams';
import {createWriteStream, mkdtempSync, existsSync} from 'fs';
import {unlink} from 'fs/promises';
import StreamZip from 'node-stream-zip';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import {confCode, confFinal, confName} from './tables.js';

const pipe = promisify(pipeline);

const {from} = pkgPgCopyStream;

const s = settings.geoip;
const url = parseTemplate(s.urlTemplate, s);

const tmpDirPath = mkdtempSync(path.join(os.tmpdir(), 'geoip-'));
const tmpArchivePath = path.join(tmpDirPath, 'archive.zip');
const tblsTemp = [confCode, confName];

export const updateGeoIpTable = async () => {
  await update(url);
};

async function update(url) {
  const start = new Date();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw Error(`Download http error: ${res.status}`);
    }

    /**
     * Remove existing table
     */
    await dropTemp();

    /**
     * Pipe data to zip file on disk
     */
    const out = createWriteStream(tmpArchivePath);
    await pipe(
      res.body,
      out
    );

    /**
     * Open zip file and read entries
     */
    const zip = new StreamZip.async({file: tmpArchivePath});
    const entries = await zip.entries();
    try {
      for (const entry of Object.values(entries)) {
        if (!entry.isDirectory) {
          for (const tblTemp of tblsTemp) {
            for (const fileRegex of tblTemp.filesRegex) {
              const toImport = fileRegex.test(entry.name);
              if (toImport) {
                const readStream = await zip.stream(entry.name);
                const qCreateTable = tblTemp.sqlTbl
                  .create()
                  .ifNotExists()
                  .toQuery();
                await pgWrite.query(qCreateTable);
                await copy(readStream, tblTemp.table.name);
              }
            }
          }
        }
      }
      await createFinal();
      console.log('mx_ip updated in', new Date() - start, ' [ms]');
    } catch (e) {
      console.log('Err during zip stream to DB', e);
    } finally {
      zip.close();
    }
  } catch (e) {
    console.log('Err during download files ', e);
  } finally {
    await dropTemp();
  }
}

function copy(stream, table) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('copy timeout'), 1000 * 60);
    pgAdmin.connect((err, client, done) => {
      if (err) reject(err);
      const copyStream = client.query(
        from(`COPY ${table} FROM STDIN CSV HEADER`)
      );
      stream.on('error', (e) => {
        done(e);
        reject(e);
      });
      copyStream.on('error', (e) => {
        done(e);
        reject(e);
      });
      copyStream.on('finish', (e) => {
        done(e);
        resolve();
      });
      stream.pipe(copyStream);
    });
  });
}

async function dropTemp() {
  if (existsSync(tmpArchivePath)) {
    await unlink(tmpArchivePath);
  }
  for (const tblTemp of tblsTemp) {
    const qDropTable = tblTemp.sqlTbl
      .drop()
      .ifExists()
      .toQuery();
    await pgWrite.query(qDropTable);
  }
}

async function createFinal() {
  const tName = confName.sqlTbl;
  const tCode = confCode.sqlTbl;
  const tFinal = confFinal.sqlTbl;

  const qDrop = tFinal
    .drop()
    .ifExists()
    .toQuery();
  await pgWrite.query(qDrop);
  const qMergeTxt = tCode
    .select(tCode.network, tName.country_iso_code, tName.country_name)
    .from(tCode.join(tName).on(tCode.geoname_id.equals(tName.geoname_id)))
    .toQuery().text;

  /**
   * TODO: AS keyword for CREATE TABlE seems not to be supported... Find a better way
   */

  const qFinal = `
     CREATE TABLE ${confFinal.table.name} AS 
     ${qMergeTxt};
  `;

  /**
   * TODO: check how set inet_ops with node-sql
   * -> tFinal.indexes().create().using('gist').on(tFinal.network <inet_ops>?)
   */

  const qIndex = `
     CREATE INDEX ON mx_ip USING gist (network inet_ops);
  `;
  console.log('Write mx_ip...');
  await pgWrite.query(qFinal);
  console.log('Write mx_ip index...');
  await pgWrite.query(qIndex);
}
