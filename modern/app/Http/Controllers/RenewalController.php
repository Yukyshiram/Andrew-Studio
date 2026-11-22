<?php

namespace App\Http\Controllers;

use App\Http\Requests\RenewLoanRequest;
use App\Services\CirculationService;
use Illuminate\Http\RedirectResponse;

class RenewalController extends Controller
{
    public function store(RenewLoanRequest $request, int $loanId, CirculationService $service): RedirectResponse
    {
        $service->renew($request->user(), $loanId, $request->validated('operation_key'));

        return back()->with('success', 'Renovación registrada. Consulta la fecha de vencimiento actual del préstamo.');
    }
}
