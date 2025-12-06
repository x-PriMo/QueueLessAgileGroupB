import { Router } from 'express';
import db from '../lib/db';
import { authGuard, memberGuard, roleGuard } from '../middleware/auth';

const router = Router();

router.use(authGuard);

// Pobierz statystyki kolejki dla firmy (używane przez OwnerDashboard)
router.get('/:companyId', authGuard, memberGuard('companyId'), roleGuard('OWNER'), (req: any, res: any) => {
    const companyId = Number(req.params.companyId);
    const today = new Date().toISOString().split('T')[0];

    // Statystyki dla dashboardu właściciela
    // Statusy: PENDING (oczekujące), ACCEPTED (zaakceptowane/oczekujące w kolejce), IN_SERVICE (w trakcie), DONE (zakończone)

    const stats = {
        pending: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE companyId = ? AND date = ? AND status = 'PENDING'").get(companyId, today) as { count: number },
        accepted: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE companyId = ? AND date = ? AND status = 'ACCEPTED'").get(companyId, today) as { count: number },
        inService: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE companyId = ? AND date = ? AND status = 'IN_SERVICE'").get(companyId, today) as { count: number },
        completed: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE companyId = ? AND date = ? AND status = 'DONE'").get(companyId, today) as { count: number },
    };

    res.json({
        queue: {
            pending: stats.pending.count,
            accepted: stats.accepted.count,
            inService: stats.inService.count,
            completed: stats.completed.count
        }
    });
});

// Aktualizacja statusu elementu kolejki (używane przez WorkerDashboard)
router.post('/:itemId/status', (req: any, res: any) => {
    const itemId = Number(req.params.itemId);
    const { status } = req.body; // WAITING, IN_SERVICE, DONE

    // Mapowanie statusów z dashboardu na DB
    // WAITING -> ACCEPTED (bo pracownik widzi tylko zaakceptowane w kolejce)
    // IN_SERVICE -> IN_SERVICE
    // DONE -> DONE

    let dbStatus = status;
    if (status === 'WAITING') dbStatus = 'ACCEPTED';

    try {
        db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(dbStatus, itemId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating queue status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
