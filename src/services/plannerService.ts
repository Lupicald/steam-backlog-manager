import { getBacklogStats } from '../database/queries';

export interface PlannerSimulation {
    hoursPerDay: number;
    monthsToComplete: number;
    estimatedDate: Date;
}

export function calculateCompletionTimeline(hoursPerDay: number): PlannerSimulation {
    const stats = getBacklogStats();
    const totalHours = stats.total_hours_remaining;

    if (totalHours <= 0) {
        return {
            hoursPerDay,
            monthsToComplete: 0,
            estimatedDate: new Date(),
        };
    }

    // Calculate total days required
    const daysRequired = totalHours / hoursPerDay;

    // Approx months
    const monthsToComplete = daysRequired / 30.44;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysRequired);

    return {
        hoursPerDay,
        monthsToComplete,
        estimatedDate,
    };
}
