<?php

namespace App\Services;

use App\Models\FinancialEntry;
use Illuminate\Database\Eloquent\Builder;

class FinanceReport
{
    /** @return Builder<FinancialEntry> */
    public function entries(?string $from, ?string $through, ?int $memberId, string $search): Builder
    {
        return FinancialEntry::query()
            ->when($from !== null && $through !== null, fn ($query) => $query->whereBetween('occurred_on', [$from, $through]))
            ->when($memberId !== null, fn ($query) => $query->where('member_id', $memberId))
            ->when($search !== '', fn ($query) => $query->whereHas('member', fn ($member) => $member->where('card_number', 'like', '%'.$search.'%')->orWhereHas('user', fn ($user) => $user->where('name', 'like', '%'.$search.'%'))));
    }

    public function period(string $from, string $through, ?int $memberId, string $search): array
    {
        $entries = $this->entries($from, $through, $memberId, $search);
        $groups = (clone $entries)->select('kind')->selectRaw('count(*) as entry_count, sum(amount_cents) as amount_cents')->groupBy('kind')->orderBy('kind')->get()
            ->map(fn ($group) => ['kind' => $group->kind, 'count' => (int) $group->getAttribute('entry_count'), 'amount_cents' => $group->amount_cents]);
        $payments = -(int) (clone $entries)->where('kind', 'payment')->sum('amount_cents');
        $reversedPayments = (int) (clone $entries)->where('kind', 'reversal')->whereHas('original', fn ($original) => $original->where('kind', 'payment'))->sum('amount_cents');

        return [
            'groups' => $groups, 'net_cents' => (int) (clone $entries)->sum('amount_cents'),
            'payments_cents' => $payments, 'reversed_payments_cents' => $reversedPayments,
            'net_payments_cents' => $payments - $reversedPayments,
            'current_recorded_balance_cents' => (int) $this->entries(null, null, $memberId, $search)->sum('amount_cents'),
        ];
    }
}
