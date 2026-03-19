import { z } from "zod";

// ######################### Sponsor Ad Status & Interval #########################
export const sponsorAdStatuses = [
	"pending_payment",
	"pending",
	"rejected",
	"active",
	"expired",
	"cancelled",
] as const;

export const sponsorAdIntervals = ["weekly", "monthly"] as const;

// ######################### Create Sponsor Ad Schema #########################
export const createSponsorAdSchema = z.object({
	itemSlug: z.string().min(1, "Item slug is required"),
	interval: z.enum(sponsorAdIntervals),
	paymentProvider: z.string().min(1, "Payment provider is required"),
});

export type CreateSponsorAdInput = z.infer<typeof createSponsorAdSchema>;

// ######################### Update Sponsor Ad Schema (Admin) #########################
export const updateSponsorAdSchema = z.object({
	id: z.string().uuid("Invalid sponsor ad ID"),
	status: z.enum(sponsorAdStatuses).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	subscriptionId: z.string().optional(),
	customerId: z.string().optional(),
});

export type UpdateSponsorAdInput = z.infer<typeof updateSponsorAdSchema>;

// ######################### Approve Sponsor Ad Schema #########################
export const approveSponsorAdSchema = z.object({
	id: z.string().uuid("Invalid sponsor ad ID"),
});

export type ApproveSponsorAdInput = z.infer<typeof approveSponsorAdSchema>;

// ######################### Reject Sponsor Ad Schema #########################
export const rejectSponsorAdSchema = z.object({
	id: z.string().uuid("Invalid sponsor ad ID"),
	rejectionReason: z
		.string()
		.min(10, "Please provide a reason (minimum 10 characters)")
		.max(500, "Rejection reason is too long (maximum 500 characters)"),
});

export type RejectSponsorAdInput = z.infer<typeof rejectSponsorAdSchema>;

// ######################### Cancel Sponsor Ad Schema #########################
export const cancelSponsorAdSchema = z.object({
	id: z.string().uuid("Invalid sponsor ad ID"),
	cancelReason: z.string().max(500).optional(),
});

export type CancelSponsorAdInput = z.infer<typeof cancelSponsorAdSchema>;

// ######################### Query Sponsor Ads Schema #########################
export const querySponsorAdsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
	status: z.enum(sponsorAdStatuses).optional(),
	interval: z.enum(sponsorAdIntervals).optional(),
	search: z.string().optional(),
	sortBy: z
		.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type QuerySponsorAdsInput = z.infer<typeof querySponsorAdsSchema>;
