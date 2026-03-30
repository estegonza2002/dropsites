import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
} from '@/lib/billing/webhook-handlers'
import { getProfileForPriceId, getStripePriceId, getDiscountPercentage } from '@/lib/billing/products'

// ---------- Supabase admin mock ----------

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
const mockInsert = vi.fn().mockReturnValue({ error: null })
const mockSelectSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'audit_log') {
        return { insert: mockInsert }
      }
      if (table === 'workspaces') {
        return {
          update: mockUpdate,
          select: () => ({
            eq: () => ({
              single: mockSelectSingle,
            }),
          }),
        }
      }
      return {
        select: () => ({ eq: () => ({ single: mockSelectSingle }) }),
        update: mockUpdate,
        insert: mockInsert,
      }
    },
  }),
}))

// ---------- Test data factories ----------

function makeCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    metadata: { workspace_id: 'ws_test_123' },
    ...overrides,
  } as unknown as Stripe.Checkout.Session
}

function makeSubscription(
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription {
  return {
    id: 'sub_test_123',
    object: 'subscription',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { workspace_id: 'ws_test_123' },
    items: {
      data: [
        {
          price: { id: 'price_pro_monthly' },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription
}

function makeInvoice(
  overrides: Partial<Stripe.Invoice> = {},
): Stripe.Invoice {
  return {
    id: 'inv_test_123',
    object: 'invoice',
    subscription: 'sub_test_123',
    amount_paid: 1900,
    amount_due: 1900,
    currency: 'usd',
    attempt_count: 1,
    ...overrides,
  } as unknown as Stripe.Invoice
}

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectSingle.mockResolvedValue({
    data: { id: 'ws_test_123', stripe_subscription_id: 'sub_test_123' },
    error: null,
  })
})

describe('Stripe webhook handlers', () => {
  describe('handleCheckoutCompleted', () => {
    it('should update workspace with customer and subscription IDs', async () => {
      const session = makeCheckoutSession()
      await handleCheckoutCompleted(session)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription.created',
          target_id: 'ws_test_123',
          target_type: 'workspace',
        }),
      )
    })

    it('should skip if workspace_id is missing from metadata', async () => {
      const session = makeCheckoutSession({ metadata: {} })
      await handleCheckoutCompleted(session)

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should skip if subscription ID is missing', async () => {
      const session = makeCheckoutSession({ subscription: null })
      await handleCheckoutCompleted(session)

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('handleSubscriptionUpdated', () => {
    it('should update limit_profile for active subscription', async () => {
      const sub = makeSubscription({ status: 'active' })
      await handleSubscriptionUpdated(sub)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription.updated',
          details: expect.objectContaining({
            limit_profile: 'pro',
            status: 'active',
          }),
        }),
      )
    })

    it('should downgrade to free for past_due subscription', async () => {
      const sub = makeSubscription({ status: 'past_due' })
      await handleSubscriptionUpdated(sub)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            limit_profile: 'free',
            status: 'past_due',
          }),
        }),
      )
    })

    it('should skip if workspace_id is missing', async () => {
      const sub = makeSubscription({ metadata: {} })
      await handleSubscriptionUpdated(sub)

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('handleSubscriptionDeleted', () => {
    it('should downgrade workspace to free and clear subscription ID', async () => {
      const sub = makeSubscription()
      await handleSubscriptionDeleted(sub)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscription.deleted',
          target_id: 'ws_test_123',
        }),
      )
    })

    it('should skip if workspace_id is missing', async () => {
      const sub = makeSubscription({ metadata: {} })
      await handleSubscriptionDeleted(sub)

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('handlePaymentSucceeded', () => {
    it('should log successful payment in audit log', async () => {
      const invoice = makeInvoice()
      await handlePaymentSucceeded(invoice)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.payment_succeeded',
          details: expect.objectContaining({
            invoice_id: 'inv_test_123',
            amount_paid: 1900,
          }),
        }),
      )
    })

    it('should skip if subscription ID is missing', async () => {
      const invoice = makeInvoice({ subscription: null })
      await handlePaymentSucceeded(invoice)

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('handlePaymentFailed', () => {
    it('should log failed payment in audit log', async () => {
      const invoice = makeInvoice()
      await handlePaymentFailed(invoice)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.payment_failed',
          details: expect.objectContaining({
            invoice_id: 'inv_test_123',
            amount_due: 1900,
          }),
        }),
      )
    })

    it('should skip if subscription ID is missing', async () => {
      const invoice = makeInvoice({ subscription: null })
      await handlePaymentFailed(invoice)

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})

describe('Product mapping', () => {
  it('should return correct price ID for pro monthly', () => {
    const id = getStripePriceId('pro', 'month')
    expect(id).toBe('price_pro_monthly')
  })

  it('should return correct price ID for team annual', () => {
    const id = getStripePriceId('team', 'year')
    expect(id).toBe('price_team_annual')
  })

  it('should throw for free tier', () => {
    expect(() => getStripePriceId('free', 'month')).toThrow(
      'Free tier does not have a Stripe price',
    )
  })

  it('should return 16% discount for annual', () => {
    expect(getDiscountPercentage('year')).toBe(16)
  })

  it('should return 0% discount for monthly', () => {
    expect(getDiscountPercentage('month')).toBe(0)
  })

  it('should map price IDs back to profiles', () => {
    expect(getProfileForPriceId('price_pro_monthly')).toBe('pro')
    expect(getProfileForPriceId('price_team_annual')).toBe('team')
    expect(getProfileForPriceId('price_unknown')).toBeNull()
  })
})
