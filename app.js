const morgan = require("morgan")
const passport = require("passport")
const swaggerJsdoc = require("swagger-jsdoc")
const swaggerUI = require("swagger-ui-express")
const cors = require("cors")
const express = require("express")
const mongoSanitize = require("express-mongo-sanitize")
const userRouter = require("./routes/userRoutes")
const specialistRouter = require("./routes/specialistRoutes")
const uploadRouter = require("./routes/uploadRoutes")
const articleRouter = require("./routes/articleRoutes")
const hospitalRouter = require("./routes/hospitalRoutes")
const appointmentRouter = require("./routes/appointmentRoutes")
const riskFactorRouter = require("./routes/riskFactorRoutes")
const globalErrHandler = require("./controllers/errorController")
const scheduleRouter = require("./routes/scheduleRoutes")
const periodTrackingRouter = require("./routes/periodTrackingRoutes")
const verificationRequestRouter = require("./routes/verificationRequestRoutes")

const AppError = require("./utils/appError")
const { createSendToken } = require("./controllers/authController")
const conversationRoutes = require("./routes/conversationRoutes")

const app = express()

app.use(
  cors({
    origin: "*", // // Allow this origin
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials like cookies or authentication headers
  })
)
app.use(express.json({}))
app.use(morgan("dev"))
app.use(mongoSanitize())

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Check-Me API",
      version: "1.0.0",
      description: "API Documentation for the check-me API",
      contact: {
        name: "Apoh Eldrige",
      },
    },
  },
  apis: ["./routes*.js", "./controllers/*.js", "app.js"], // files containing annotations as above
}

const swaggerDocs = swaggerJsdoc(swaggerOptions)
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs))
app.use("/api/v1/users/", userRouter)
app.use("/api/v1/uploads/", uploadRouter)
app.use("/api/v1/articles/", articleRouter)
app.use("/api/v1/hospitals/", hospitalRouter)
app.use("/api/v1/specialists/", specialistRouter)
app.use("/api/v1/appointments", appointmentRouter)
app.use("/api/v1/schedules", scheduleRouter)
app.use("/api/v1/riskFactors", riskFactorRouter)
app.use("/api/v1/requests", verificationRequestRouter)
app.use("/api/v1/period-tracking", periodTrackingRouter)
app.use("/api/v1/chat", conversationRoutes)
app.get("/", (req, res) => res.send("Welcome to Check-Me API"))

const signUpViaGoogle = require("./controllers/authController").signUpViaGoogle(
  passport
)

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
)

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    createSendToken(req.user, 200, res)
    // res.redirect('/');
  }
)

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrHandler)
module.exports = app
