import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import inboxesRouter from "./inboxes";
import emailsRouter from "./emails";
import creditsRouter from "./credits";
import plansRouter from "./plans";
import subscriptionsRouter from "./subscriptions";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import paymentsRouter from "./payments";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/me", meRouter);
router.use("/inboxes", inboxesRouter);
router.use("/emails", emailsRouter);
router.use("/credits", creditsRouter);
router.use("/plans", plansRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/payments", paymentsRouter);
router.use("/admin", adminRouter);

export default router;
