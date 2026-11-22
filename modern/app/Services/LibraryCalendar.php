<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class LibraryCalendar
{
    public function today(array $terms): CarbonImmutable
    {
        return CarbonImmutable::instance(now())->setTimezone($terms['timezone'])->startOfDay();
    }

    public function isOpen(CarbonImmutable $day, array $terms): bool
    {
        return ! in_array($day->dayOfWeek, $terms['closed_weekdays'], true)
            && ! in_array($day->toDateString(), $terms['closure_dates'], true);
    }

    public function dueDate(CarbonImmutable $from, int $days, array $terms): string
    {
        $day = $from->setTimezone($terms['timezone'])->startOfDay()->addDays($days);
        for ($attempt = 0; $attempt < 3660; $attempt++) {
            if ($this->isOpen($day, $terms)) {
                return $day->toDateString();
            }
            $day = $day->addDay();
        }
        throw ValidationException::withMessages(['calendar' => 'El calendario no ofrece una fecha de apertura válida.']);
    }

    /** @return list<string> */
    public function overdueDates(string $dueOn, string $through, array $terms): array
    {
        $day = CarbonImmutable::parse($dueOn, $terms['timezone'])->addDay();
        $end = CarbonImmutable::parse($through, $terms['timezone']);
        $dates = [];
        while ($day->lessThanOrEqualTo($end)) {
            if ($this->isOpen($day, $terms)) {
                $dates[] = $day->toDateString();
            }
            $day = $day->addDay();
        }

        return array_slice($dates, $terms['grace_days']);
    }
}
