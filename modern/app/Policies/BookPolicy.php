<?php

namespace App\Policies;

use App\Models\Book;
use App\Models\User;

class BookPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canManageBooks();
    }

    public function create(User $user): bool
    {
        return $user->canManageBooks();
    }

    public function update(User $user, Book $book): bool
    {
        return $user->canManageBooks() && ! $book->trashed();
    }

    public function delete(User $user, Book $book): bool
    {
        return $this->update($user, $book);
    }

    public function restore(User $user, Book $book): bool
    {
        return $user->canManageBooks() && $book->trashed();
    }

    public function archiveAll(User $user): bool
    {
        return $user->isAdmin();
    }
}
