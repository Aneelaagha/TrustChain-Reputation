import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import signalsRouter from "./signals";
import vouchesRouter from "./vouches";
import scoresRouter from "./scores";
import explainRouter from "./explain";
import networkRouter from "./network";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(signalsRouter);
router.use(vouchesRouter);
router.use(scoresRouter);
router.use(explainRouter);
router.use(networkRouter);
router.use(seedRouter);

export default router;
