const pad = (n) => String(n).padStart(2, '0');

/** A JS Date as local 'YYYY-MM-DD HH:mm:ss', the form MySQL compares against DATE and TIME columns. */
function toSqlDateTime(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

module.exports = { toSqlDateTime };
