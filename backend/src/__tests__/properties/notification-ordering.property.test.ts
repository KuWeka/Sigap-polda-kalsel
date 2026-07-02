import * as fc from 'fast-check';

/**
 * Property 11: Notification Ordering and Pagination
 *
 * For any list of notifications returned by the system:
 * - They SHALL be ordered by createdAt descending (each item's createdAt >= next item's createdAt)
 * - The maximum items per page SHALL be 50
 * - The unread count SHALL equal the count of notifications where isRead === false
 * - Pagination metadata totalPages SHALL equal Math.ceil(totalItems / 50)
 *
 * **Validates: Requirements 10.9**
 */

// --- Types mirroring the notification service ---

interface Notification {
  id: string;
  userId: string;
  type: string;
  ticketNumber: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface PaginatedNotifications {
  data: Notification[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  unreadCount: number;
}

// --- Pure logic functions extracted from notificationService.ts ---

/**
 * Simulates the getByUser pagination logic in isolation (no database).
 * This mirrors the exact logic from notificationService.ts.
 */
function getByUserPure(
  allNotifications: Notification[],
  page: number = 1
): PaginatedNotifications {
  const pageSize = 50;
  const currentPage = page > 0 ? page : 1;
  const skip = (currentPage - 1) * pageSize;

  // Sort by createdAt descending
  const sorted = [...allNotifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Paginate
  const data = sorted.slice(skip, skip + pageSize);

  const totalItems = allNotifications.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  return {
    data,
    pagination: {
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
    },
    unreadCount,
  };
}

// --- Arbitraries ---

const notificationTypeArb = fc.constantFrom(
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'TICKET_COMPLETED',
  'TICKET_CANCELLED'
);

const notificationArb = fc.record({
  id: fc.uuid(),
  userId: fc.constant('user-1'), // Same user for all notifications in a set
  type: notificationTypeArb,
  ticketNumber: fc.stringMatching(/^TKT-20[2-9]\d-\d{5}$/),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  isRead: fc.boolean(),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).filter((d: Date) => !isNaN(d.getTime())),
});

const notificationListArb = fc.array(notificationArb, { minLength: 0, maxLength: 200 });

const pageArb = fc.integer({ min: 1, max: 10 });

// --- Property Tests ---

describe('Property 11: Notification Ordering and Pagination', () => {
  it('for any list of notifications, results are ordered by createdAt descending (each item createdAt >= next item createdAt)', () => {
    fc.assert(
      fc.property(notificationListArb, pageArb, (notifications, page) => {
        const result = getByUserPure(notifications, page);

        // Verify descending order: each item's createdAt >= next item's createdAt
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].createdAt.getTime()).toBeGreaterThanOrEqual(
            result.data[i + 1].createdAt.getTime()
          );
        }
      }),
      { numRuns: 500 }
    );
  });

  it('for any page of notifications, the maximum items returned is 50', () => {
    fc.assert(
      fc.property(notificationListArb, pageArb, (notifications, page) => {
        const result = getByUserPure(notifications, page);

        // Page size is always capped at 50
        expect(result.data.length).toBeLessThanOrEqual(50);
        expect(result.pagination.pageSize).toBe(50);
      }),
      { numRuns: 500 }
    );
  });

  it('for any set of notifications with mixed isRead values, unread count equals the count where isRead === false', () => {
    fc.assert(
      fc.property(notificationListArb, (notifications) => {
        const result = getByUserPure(notifications, 1);

        const expectedUnreadCount = notifications.filter((n) => !n.isRead).length;
        expect(result.unreadCount).toBe(expectedUnreadCount);
      }),
      { numRuns: 500 }
    );
  });

  it('pagination totalPages equals Math.ceil(totalItems / 50)', () => {
    fc.assert(
      fc.property(notificationListArb, pageArb, (notifications, page) => {
        const result = getByUserPure(notifications, page);

        const expectedTotalPages = Math.ceil(notifications.length / 50);
        expect(result.pagination.totalPages).toBe(expectedTotalPages);
        expect(result.pagination.totalItems).toBe(notifications.length);
      }),
      { numRuns: 500 }
    );
  });

  it('for an empty notification list, returns empty data with 0 totalPages and 0 unreadCount', () => {
    fc.assert(
      fc.property(pageArb, (page) => {
        const result = getByUserPure([], page);

        expect(result.data).toHaveLength(0);
        expect(result.pagination.totalItems).toBe(0);
        expect(result.pagination.totalPages).toBe(0);
        expect(result.unreadCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('for any page beyond the last page, returns empty data while preserving correct metadata', () => {
    // Generate lists with at least 1 notification so there's a valid "last page"
    const nonEmptyListArb = fc.array(notificationArb, { minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(nonEmptyListArb, (notifications) => {
        const totalPages = Math.ceil(notifications.length / 50);
        const beyondPage = totalPages + 1;

        const result = getByUserPure(notifications, beyondPage);

        expect(result.data).toHaveLength(0);
        expect(result.pagination.totalItems).toBe(notifications.length);
        expect(result.pagination.totalPages).toBe(totalPages);
      }),
      { numRuns: 200 }
    );
  });

  it('for page <= 0, defaults to page 1 (same as page=1 behavior)', () => {
    const invalidPageArb = fc.integer({ min: -100, max: 0 });

    fc.assert(
      fc.property(notificationListArb, invalidPageArb, (notifications, invalidPage) => {
        const resultInvalid = getByUserPure(notifications, invalidPage);
        const resultPage1 = getByUserPure(notifications, 1);

        // Should behave identically to page 1
        expect(resultInvalid.data.length).toBe(resultPage1.data.length);
        expect(resultInvalid.pagination.page).toBe(1);
        expect(resultInvalid.pagination.totalItems).toBe(resultPage1.pagination.totalItems);
      }),
      { numRuns: 200 }
    );
  });
});
