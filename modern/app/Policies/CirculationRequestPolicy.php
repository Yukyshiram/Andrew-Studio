<?php

namespace App\Policies;

use App\Models\CirculationRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CirculationRequestPolicy
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
    public function view(User $user, CirculationRequest $circulationRequest): Response
    {
        return ! $user->trashed() && ($user->canManageBooks() || $circulationRequest->member()->where('user_id', $user->id)->exists())
            ? Response::allow() : Response::denyAsNotFound();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return ! $user->trashed() && $user->member()->exists();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function manage(User $user, CirculationRequest $circulationRequest): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function cancel(User $user, CirculationRequest $circulationRequest): Response
    {
        return $this->view($user, $circulationRequest);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CirculationRequest $circulationRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CirculationRequest $circulationRequest): bool
    {
        return false;
    }
}
