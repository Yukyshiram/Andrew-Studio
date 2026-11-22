<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CirculationController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LibraryPolicyController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MyLibraryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RenewalController;
use App\Http\Controllers\UserController;
use App\Models\AuditEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [CatalogController::class, 'welcome'])->name('home');
Route::get('/catalog', [CatalogController::class, 'index'])->name('catalog.index');
Route::get('/catalog/{book}', [CatalogController::class, 'show'])->name('catalog.show');

Route::middleware('guest')->group(function (): void {
    Route::inertia('/login', 'auth/login')->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login-global');
    Route::inertia('/register', 'auth/register')->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:registration');
    Route::inertia('/forgot-password', 'auth/forgot-password')->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:recovery')->name('password.email');
    Route::get('/reset-password/{token}', fn (Request $request, string $token) => Inertia::render('auth/reset-password', [
        'token' => $token, 'email' => is_string($request->query('email')) ? $request->query('email') : '',
    ]))->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:recovery')->name('password.update');
});

Route::middleware('auth')->group(function (): void {
    Route::get('/my-library', [MyLibraryController::class, 'index'])->name('my-library');
    Route::post('/my-library/finance/refresh', [MyLibraryController::class, 'refreshFinance'])->name('my-library.finance.refresh');
    Route::post('/my-library/loans/{loanId}/renew', [RenewalController::class, 'store'])->whereNumber('loanId')->name('my-library.renew');
    Route::post('/my-library/notices/{noticeId}/read', [MyLibraryController::class, 'readNotice'])->whereNumber('noticeId')->name('my-library.notices.read');
    Route::post('/my-library/requests', [MyLibraryController::class, 'store'])->name('my-library.request');
    Route::post('/my-library/requests/{requestId}/cancel', [MyLibraryController::class, 'cancel'])->whereNumber('requestId')->name('my-library.cancel');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [CatalogController::class, 'dashboard'])->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'password'])->middleware('throttle:sensitive')->name('profile.password');
    Route::prefix('manage')->name('manage.')->group(function (): void {
        Route::get('/finance', [FinanceController::class, 'index'])->middleware('can:admin')->name('finance.index');
        Route::post('/finance/entries', [FinanceController::class, 'store'])->middleware('can:admin')->name('finance.store');
        Route::post('/finance/entries/{entryId}/reverse', [FinanceController::class, 'reverse'])->whereNumber('entryId')->middleware('can:admin')->name('finance.reverse');
        Route::post('/finance/refresh', [FinanceController::class, 'refresh'])->middleware('can:admin')->name('finance.refresh');
        Route::get('/circulation', [CirculationController::class, 'index'])->name('circulation.index');
        Route::post('/circulation/refresh', [CirculationController::class, 'refresh'])->middleware('can:circulate')->name('circulation.refresh');
        Route::post('/circulation/loans/{loanId}/renew', [RenewalController::class, 'store'])->whereNumber('loanId')->middleware('can:circulate')->name('circulation.renew');
        Route::post('/circulation/requests/{requestId}/prepare', [CirculationController::class, 'prepare'])->whereNumber('requestId')->name('circulation.prepare');
        Route::post('/circulation/requests/{requestId}/issue', [CirculationController::class, 'issue'])->whereNumber('requestId')->name('circulation.issue');
        Route::post('/circulation/requests/{requestId}/reject', [CirculationController::class, 'reject'])->whereNumber('requestId')->name('circulation.reject');
        Route::post('/circulation/loans/{loanId}/receive', [CirculationController::class, 'receive'])->whereNumber('loanId')->name('circulation.receive');
        Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
        Route::put('/inventory/{copy}', [InventoryController::class, 'update'])->name('inventory.update');
        Route::get('/members', [MemberController::class, 'index'])->name('members.index');
        Route::post('/members', [MemberController::class, 'store'])->name('members.store');
        Route::put('/members/{member}', [MemberController::class, 'update'])->name('members.update');
        Route::get('/policy', [LibraryPolicyController::class, 'edit'])->name('policy.edit');
        Route::put('/policy', [LibraryPolicyController::class, 'update'])->name('policy.update');
        Route::get('/books', [BookController::class, 'index'])->name('books.index');
        Route::get('/books/create', [BookController::class, 'create'])->name('books.create');
        Route::post('/books', [BookController::class, 'store'])->name('books.store');
        Route::post('/books/archive-all', [BookController::class, 'archiveAll'])->middleware('throttle:sensitive')->name('books.archive_all');
        Route::get('/books/{book}/edit', [BookController::class, 'edit'])->name('books.edit');
        Route::put('/books/{book}', [BookController::class, 'update'])->name('books.update');
        Route::delete('/books/{book}', [BookController::class, 'destroy'])->name('books.destroy');
        Route::post('/books/{book}/restore', [BookController::class, 'restore'])->withTrashed()->name('books.restore');
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('/audit', function (Request $request) {
            $filters = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
            $events = AuditEvent::with('actor:id,name')->when($filters['q'] ?? null, fn ($query, $q) => $query->where('action', $q))
                ->latest('id')->paginate(20)->withQueryString();

            return Inertia::render('audit/index', ['events' => $events, 'filters' => ['q' => $filters['q'] ?? '']]);
        })->middleware('can:admin')->name('audit.index');
    });
});
