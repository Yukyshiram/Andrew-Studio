<?php

namespace App\Services;

use App\Models\Acquisition;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\LibraryNotice;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;

class DashboardService
{
    public function __construct(private LibraryCalendar $calendar, private LedgerService $ledger, private FinanceReport $finance) {}

    public function for(User $actor): array
    {
        $actor = User::findOrFail($actor->id);
        $terms = LibraryPolicy::current()->terms();
        $today = $this->calendar->today($terms);
        $day = $today->toDateString();
        $member = Member::where('user_id', $actor->id)->first();
        $active = Loan::where('status', 'active');
        $upcoming = Acquisition::whereIn('status', Acquisition::OPEN)->whereHas('book', fn ($book) => $book->whereNull('books.deleted_at'));

        return [
            'today' => $day, 'timezone' => $terms['timezone'], 'currency' => $terms['currency'],
            'reading' => $member ? [
                'member' => $member->only(['card_number', 'status', 'expires_on']),
                'active' => $member->loans()->where('status', 'active')->count(),
                'overdue' => $member->loans()->where('status', 'active')->where('due_on', '<', $day)->count(),
                'requests' => $member->requests()->whereIn('status', CirculationRequest::OPEN)->count(),
                'ready' => $member->requests()->where('status', 'ready')->count(),
                'unread' => LibraryNotice::where('member_id', $member->id)->whereNull('read_at')->count(),
                'account' => $this->ledger->summary($member),
                'nextDue' => $member->loans()->with('copy.book')->where('status', 'active')->orderBy('due_on')->orderBy('id')->limit(3)->get(),
            ] : null,
            'operations' => $actor->canManageBooks() ? [
                'active' => (clone $active)->count(),
                'overdue' => (clone $active)->where('due_on', '<', $day)->count(),
                'due_today' => (clone $active)->where('due_on', $day)->count(),
                'pending' => CirculationRequest::where('status', 'pending')->count(),
                'waiting' => CirculationRequest::where('status', 'waiting')->count(),
                'ready' => CirculationRequest::where('status', 'ready')->count(),
                'available' => BookCopy::where('status', 'available')->whereIn('condition', ['good', 'worn'])->whereHas('book', fn ($book) => $book->whereNull('books.deleted_at'))->count(),
                'upcoming' => (clone $upcoming)->count(),
                'urgentLoans' => (clone $active)->where('due_on', '<=', $day)->with(['copy.book', 'member.user:id,name'])->orderBy('due_on')->orderBy('id')->limit(5)->get(),
            ] : null,
            'treasury' => $actor->isAdmin() ? $this->finance->period($today->startOfMonth()->toDateString(), $day, null, '') : null,
            'upcoming' => $upcoming->with('book:id,title,author,category,cover_color,deleted_at')
                ->orderByRaw('CASE WHEN expected_on IS NULL THEN 1 ELSE 0 END')->orderBy('expected_on')->orderBy('id')->limit(3)
                ->get(['id', 'book_id', ...Acquisition::FIELDS]),
        ];
    }
}
