import { Router, type IRouter } from "express";
import { requireActiveUser } from "../lib/auth";
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
import publicRouter from "./public";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/public", publicRouter);
// /me is intentionally left without requireActiveUser so suspended users can see their status.
router.use("/me", meRouter);
router.use("/inboxes", requireActiveUser, inboxesRouter);
router.use("/emails", requireActiveUser, emailsRouter);
router.use("/credits", requireActiveUser, creditsRouter);
router.use("/plans", requireActiveUser, plansRouter);
router.use("/subscriptions", requireActiveUser, subscriptionsRouter);
router.use("/dashboard", requireActiveUser, dashboardRouter);
router.use("/analytics", requireActiveUser, analyticsRouter);
router.use("/payments", requireActiveUser, paymentsRouter);
router.use("/admin", requireActiveUser, adminRouter);

export default router;
