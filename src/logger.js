/**
 * logger for create logFile as lambda_api.log to current dir if path is not passed by User.
 */
var winston = require("winston");

function logging(logFile){
  var winstonFormat = winston.format;
  if (process.env.LT_API_LOG === "true"){
    return winston.createLogger({
      level: "info",
      format: winstonFormat.combine(
        winstonFormat.timestamp(),
        winstonFormat.json()
      ),
      transports: [new winston.transports.File({ filename: logFile ? logFile : "lambda_api.log" })]
    });
  }
  return winston.createLogger({
    level: "info",
    silent:"true",
    format: winstonFormat.combine(
      winstonFormat.timestamp(),
      winstonFormat.json()
    ),
    transports: [new winston.transports.Console()]
  });
}
module.exports = logging