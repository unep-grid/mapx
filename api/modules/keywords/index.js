import { pgRead } from "#mapx/db";
export async function ioKeywordsSearch(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session.user_roles.publisher) {
      cb(false);
      throw new Error("unauthorized");
    }

    const keyword = config.keyword || "";

    const res = await searchKeyword(keyword);

    cb(res);
  } catch (e) {
    cb(false);
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
}

async function searchKeyword(keyword) {
  try {
    const queryString = `
        SELECT keyword, count, similarity(keyword, $1) AS similarity
        FROM mx_sources_meta_keywords 
        WHERE keyword % $1 
        ORDER BY similarity DESC 
        LIMIT 10;
    `;

    const res = await pgRead.query(queryString, [keyword]);
    return res.rows;
  } catch (err) {
    console.error("Error querying the database", err.stack);
    throw err;
  }
}
