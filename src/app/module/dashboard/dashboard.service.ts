import { EventStatus, ParticipationStatus, PaymentStatus, InvitationStatus } from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const getOrganizerDashboardData = async (organizerId: string) => {
    // We will use Promise.all to fetch all data concurrently for better performance
    const [
        totalEventsRaw,
        activeEventsRaw,
        totalParticipantsRaw,
        revenueEarnedRaw,
        pendingRequestsRaw,
        avgRatingRaw,
        participationsRaw,
        paymentsRaw,
        reviewsRaw,
        upcomingEvents,
    ] = await Promise.all([
        // 1. Total events
        prisma.event.count({ where: { organizerId } }),

        // 2. Active events
        prisma.event.count({
            where: { organizerId, status: EventStatus.PUBLISHED },
        }),

        // 3. Total participants (approved/confirmed)
        prisma.participation.count({
            where: {
                event: { organizerId },
                status: { in: [ParticipationStatus.APPROVED, ParticipationStatus.CONFIRMED] },
            },
        }),

        // 4. Revenue earned (completed)
        prisma.payment.aggregate({
            where: {
                event: { organizerId },
                status: PaymentStatus.COMPLETED,
            },
            _sum: { amount: true },
        }),

        // 5. Pending requests
        prisma.participation.count({
            where: {
                event: { organizerId },
                status: ParticipationStatus.PENDING,
            },
        }),

        // 6. Avg rating
        prisma.review.aggregate({
            where: {
                event: { organizerId },
                deletedAt: null,
            },
            _avg: { rating: true },
        }),

        // 7. Participations for charts (breakdown & daily trend & per event)
        prisma.participation.findMany({
            where: { event: { organizerId } },
            select: {
                id: true,
                status: true,
                joinedAt: true,
                event: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
        }),

        // 8. Payments for charts (revenue per event)
        prisma.payment.findMany({
            where: {
                event: { organizerId },
                status: PaymentStatus.COMPLETED,
            },
            select: {
                amount: true,
                event: { select: { id: true, title: true } }
            }
        }),

        // 9. Reviews for charts (rating per event)
        prisma.review.findMany({
            where: {
                event: { organizerId },
                deletedAt: null,
            },
            select: {
                rating: true,
                event: { select: { id: true, title: true } }
            }
        }),

        // 10. Upcoming events
        prisma.event.findMany({
            where: {
                organizerId,
                startDate: { gt: new Date() },
            },
            select: {
                id: true,
                title: true,
                startDate: true,
                status: true,
                maxParticipants: true,
                _count: {
                    select: {
                        participations: {
                            where: {
                                status: { in: [ParticipationStatus.APPROVED, ParticipationStatus.CONFIRMED] }
                            }
                        }
                    }
                }
            },
            orderBy: { startDate: "asc" },
            take: 5,
        })
    ]);

    // Data Processing for Charts

    const participantsPerEventMap: Record<string, { event: string; count: number }> = {};
    const participationStatusBreakdownMap: Record<string, number> = {
        [ParticipationStatus.CONFIRMED]: 0,
        [ParticipationStatus.APPROVED]: 0,
        [ParticipationStatus.PENDING]: 0,
        [ParticipationStatus.REJECTED]: 0,
        [ParticipationStatus.BANNED]: 0,
        [ParticipationStatus.CANCELLED]: 0,
    };
    const joinRequestsOverTimeMap: Record<string, number> = {};

    participationsRaw.forEach(p => {
        participationStatusBreakdownMap[p.status] = (participationStatusBreakdownMap[p.status] || 0) + 1;

        if (p.status === ParticipationStatus.APPROVED || p.status === ParticipationStatus.CONFIRMED) {
            const evId = p.event.id;
            if (!participantsPerEventMap[evId]) {
                participantsPerEventMap[evId] = { event: p.event.title, count: 0 };
            }
            participantsPerEventMap[evId].count += 1;
        }

        const dateStr = p.joinedAt.toISOString().split('T')[0];
        joinRequestsOverTimeMap[dateStr] = (joinRequestsOverTimeMap[dateStr] || 0) + 1;
    });

    const participantsPerEvent = Object.values(participantsPerEventMap).sort((a, b) => b.count - a.count);
    
    const participationStatusBreakdown = Object.entries(participationStatusBreakdownMap)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({ status, count }));

    const joinRequestsOverTime = Object.entries(joinRequestsOverTimeMap)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, count]) => ({ date, count }));

    const revenuePerEventMap: Record<string, { event: string; revenue: number }> = {};
    paymentsRaw.forEach(p => {
        const evId = p.event.id;
        if (!revenuePerEventMap[evId]) {
            revenuePerEventMap[evId] = { event: p.event.title, revenue: 0 };
        }
        revenuePerEventMap[evId].revenue += p.amount;
    });
    const revenuePerEvent = Object.values(revenuePerEventMap).sort((a, b) => b.revenue - a.revenue);

    const ratingPerEventMap: Record<string, { event: string; totalRating: number; count: number }> = {};
    reviewsRaw.forEach(r => {
        const evId = r.event.id;
        if (!ratingPerEventMap[evId]) {
            ratingPerEventMap[evId] = { event: r.event.title, totalRating: 0, count: 0 };
        }
        ratingPerEventMap[evId].totalRating += r.rating;
        ratingPerEventMap[evId].count += 1;
    });
    const averageRatingPerEvent = Object.values(ratingPerEventMap)
        .map(item => ({
            event: item.event,
            averageRating: Number((item.totalRating / item.count).toFixed(1))
        }))
        .sort((a, b) => b.averageRating - a.averageRating);

    const upcomingEventsList = upcomingEvents.map(event => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        status: event.status,
        fillRate: event.maxParticipants && event.maxParticipants > 0 
            ? Math.round((event._count.participations / event.maxParticipants) * 100) 
            : 0,
        confirmedCount: event._count.participations,
        maxParticipants: event.maxParticipants,
    }));

    return {
        statCards: {
            totalEvents: totalEventsRaw,
            activeEvents: activeEventsRaw,
            totalParticipants: totalParticipantsRaw,
            revenueEarned: revenueEarnedRaw._sum.amount || 0,
            pendingRequests: pendingRequestsRaw,
            avgRating: Number((avgRatingRaw._avg.rating || 0).toFixed(1)),
        },
        charts: {
            participantsPerEvent,
            participationStatusBreakdown,
            joinRequestsOverTime,
            revenuePerEvent,
            averageRatingPerEvent,
        },
        lists: {
            upcomingEvents: upcomingEventsList,
        }
    };
};

const getAdminDashboardData = async () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [
        totalUsersRaw,
        newUsersThisWeek,
        totalEventsRaw,
        activeEventsRaw,
        completedRevenue,
        pendingReports,
        usersRaw,
        eventsRaw,
        paymentsRaw,
        activityLogsRaw
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: lastWeek } } }),
        prisma.event.count(),
        prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
        prisma.payment.aggregate({
            where: { status: PaymentStatus.COMPLETED },
            _sum: { amount: true },
        }),
        Promise.resolve(0),
        
        prisma.user.findMany({ select: { createdAt: true } }),
        prisma.event.findMany({
            select: {
                visibility: true,
                category: { select: { name: true } }
            }
        }),
        prisma.payment.findMany({
            select: { amount: true, status: true, createdAt: true }
        }),
        prisma.activityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                action: true,
                entity: true,
                createdAt: true,
                event: { select: { title: true } }
            }
        })
    ]);

    const newUsersOverTimeMap: Record<string, number> = {};
    usersRaw.forEach(u => {
        const d = u.createdAt.toISOString().split("T")[0];
        newUsersOverTimeMap[d] = (newUsersOverTimeMap[d] || 0) + 1;
    });
    const newUsersOverTime = Object.entries(newUsersOverTimeMap)
        .sort(([dA], [dB]) => new Date(dA).getTime() - new Date(dB).getTime())
        .map(([date, count]) => ({ date, count }));

    const eventsByCategoryMap: Record<string, number> = {};
    const visibilitySplitMap: Record<string, number> = { PUBLIC: 0, PRIVATE: 0 };
    eventsRaw.forEach(e => {
        visibilitySplitMap[e.visibility] = (visibilitySplitMap[e.visibility] || 0) + 1;
        eventsByCategoryMap[e.category.name] = (eventsByCategoryMap[e.category.name] || 0) + 1;
    });
    const eventsByCategory = Object.entries(eventsByCategoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));
    const eventVisibilitySplit = Object.entries(visibilitySplitMap)
        .map(([visibility, count]) => ({ visibility, count }));

    const revenueByStatusMap: Record<string, number> = {
        [PaymentStatus.COMPLETED]: 0,
        [PaymentStatus.REFUNDED]: 0,
    };
    const revenueOverTimeMap: Record<string, number> = {};

    paymentsRaw.forEach(p => {
        if (p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED) {
            revenueByStatusMap[p.status] += p.amount;
        }

        if (p.status === PaymentStatus.COMPLETED) {
            const monthStr = p.createdAt.toISOString().substring(0, 7); 
            revenueOverTimeMap[monthStr] = (revenueOverTimeMap[monthStr] || 0) + p.amount;
        }
    });

    const revenueByPaymentStatus = Object.entries(revenueByStatusMap)
        .map(([status, total]) => ({ status, total }));
    const revenueOverTime = Object.entries(revenueOverTimeMap)
        .sort(([mA], [mB]) => mA.localeCompare(mB))
        .map(([month, amount]) => ({ month, amount }));

    const recentActivityFeed = activityLogsRaw.map(log => ({
        action: log.action,
        entity: log.event?.title || log.entity,
        when: log.createdAt,
    }));

    return {
        statCards: {
            totalUsers: totalUsersRaw,
            newUsersThisWeek,
            totalEvents: totalEventsRaw,
            activeEvents: activeEventsRaw,
            totalRevenue: completedRevenue._sum.amount || 0,
            pendingReports,
        },
        charts: {
            newUsersOverTime,
            eventsByCategory,
            eventVisibilitySplit,
            revenueByPaymentStatus,
            revenueOverTime,
        },
        lists: {
            recentActivityFeed,
        }
    };
};

const getParticipantDashboardData = async (userId: string) => {
    const [
        totalEventsJoined,
        upcomingEventsRaw,
        totalSpentRaw,
        reviewsWrittenRaw,
        participationsRaw,
        paymentsRaw,
        pendingInvitationsRaw
    ] = await Promise.all([
        prisma.participation.count({ where: { userId } }),
        prisma.participation.findMany({
            where: {
                userId,
                status: ParticipationStatus.CONFIRMED,
                event: { startDate: { gt: new Date() } }
            },
            select: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        registrationFee: true,
                        currency: true
                    }
                }
            },
            orderBy: { event: { startDate: "asc" } },
            take: 5
        }),
        prisma.payment.aggregate({
            where: { userId, status: PaymentStatus.COMPLETED },
            _sum: { amount: true }
        }),
        prisma.review.aggregate({
            where: { userId, deletedAt: null },
            _count: { id: true },
            _avg: { rating: true }
        }),
        prisma.participation.findMany({
            where: { userId },
            select: {
                status: true,
                joinedAt: true,
                event: {
                    select: {
                        category: { select: { name: true } }
                    }
                }
            }
        }),
        prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                event: { select: { title: true } }
            }
        }),
        prisma.invitation.findMany({
            where: { receiverId: userId, status: InvitationStatus.PENDING },
            select: {
                id: true,
                event: { select: { title: true, registrationFee: true, currency: true } },
                sender: { select: { name: true } }
            },
            take: 5
        })
    ]);

    const participationStatusBreakdownMap: Record<string, number> = {
        [ParticipationStatus.CONFIRMED]: 0,
        [ParticipationStatus.PENDING]: 0,
        [ParticipationStatus.CANCELLED]: 0,
    };
    
    const eventActivityOverTimeMap: Record<string, number> = {};
    const eventsJoinedByCategoryMap: Record<string, number> = {};

    participationsRaw.forEach(p => {
        participationStatusBreakdownMap[p.status] = (participationStatusBreakdownMap[p.status] || 0) + 1;
        
        eventsJoinedByCategoryMap[p.event.category.name] = (eventsJoinedByCategoryMap[p.event.category.name] || 0) + 1;

        const monthStr = p.joinedAt.toISOString().substring(0, 7);
        eventActivityOverTimeMap[monthStr] = (eventActivityOverTimeMap[monthStr] || 0) + 1;
    });

    const participationStatusBreakdown = Object.entries(participationStatusBreakdownMap)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({ status, count }));

    const eventsJoinedByCategory = Object.entries(eventsJoinedByCategoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

    const eventActivityOverTime = Object.entries(eventActivityOverTimeMap)
        .sort(([mA], [mB]) => mA.localeCompare(mB))
        .map(([month, count]) => ({ month, count }));

    const upcomingConfirmedEvents = upcomingEventsRaw.map(p => ({
        id: p.event.id,
        event: p.event.title,
        date: p.event.startDate,
        fee: p.event.registrationFee,
        currency: p.event.currency
    }));

    const paymentHistory = paymentsRaw.map(p => ({
        id: p.id,
        event: p.event.title,
        amount: p.amount,
        currency: p.currency,
        status: p.status
    }));

    const pendingInvitations = pendingInvitationsRaw.map(inv => ({
        id: inv.id,
        event: inv.event.title,
        host: inv.sender.name,
        fee: inv.event.registrationFee,
        currency: inv.event.currency
    }));

    return {
        statCards: {
            eventsJoined: totalEventsJoined,
            upcomingEvents: upcomingEventsRaw.length,
            totalSpent: totalSpentRaw._sum.amount || 0,
            reviewsWritten: reviewsWrittenRaw._count.id,
            avgRatingGiven: Number((reviewsWrittenRaw._avg.rating || 0).toFixed(1)),
        },
        charts: {
            participationStatusBreakdown,
            eventsJoinedByCategory,
            eventActivityOverTime,
        },
        lists: {
            upcomingConfirmedEvents,
            paymentHistory,
            pendingInvitations,
        }
    };
};

export const DashboardService = {
    getOrganizerDashboardData,
    getAdminDashboardData,
    getParticipantDashboardData,
};
