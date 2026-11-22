<?php

namespace App\Policies;

use App\Models\Loan;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class LoanPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return ! $user->trashed() && $user->canManageBooks();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Loan $loan): Response
    {
        return ! $user->trashed() && ($user->canManageBooks() || $loan->member()->where('user_id', $user->id)->exists())
            ? Response::allow() : Response::denyAsNotFound();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function receive(User $user, Loan $loan): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function renew(User $user, Loan $loan): bool
    {
        return $loan->status === 'active' && $this->view($user, $loan)->allowed();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Loan $loan): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Loan $loan): bool
    {
        return false;
    }
}
