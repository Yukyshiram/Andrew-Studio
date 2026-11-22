<?php

namespace Database\Seeders;

use App\Models\Acquisition;
use App\Models\AuditEvent;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\CirculationRequest;
use App\Models\FinancialEntry;
use App\Models\ImportBatch;
use App\Models\LibraryPolicy;
use App\Models\Loan;
use App\Models\Member;
use App\Models\User;
use App\Services\AcquisitionService;
use App\Services\CirculationService;
use App\Services\LedgerService;
use App\Services\LibraryCalendar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class LibraryDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('bibliotecary.demo_seed_enabled')) {
            throw new RuntimeException('La muestra 3.0 requiere entorno local o de pruebas y DEMO_SEED_ENABLED=true.');
        }
        DB::transaction(function (): void {
            $policy = LibraryPolicy::lockForUpdate()->findOrFail(1);
            if (AuditEvent::where('action', 'demo.v3.seeded')->exists()) {
                return;
            }
            $emails = ['demo.admin@example.test', 'demo.biblioteca@example.test', 'demo.lector@example.test'];
            $hasPrivateData = User::withTrashed()->whereNotIn('email', $emails)->exists()
                || User::withTrashed()->whereNotNull('legacy_id')->exists()
                || User::onlyTrashed()->exists()
                || Book::withTrashed()->where(fn ($book) => $book->whereNotNull('import_batch_id')->orWhereNotNull('legacy_id')->orWhere('description', 'not like', '%Esta ficha, su autoría y su editorial son datos ficticios%'))->exists()
                || ImportBatch::exists();
            if ($hasPrivateData || Member::exists() || BookCopy::exists() || CirculationRequest::exists() || Loan::exists() || FinancialEntry::exists() || Acquisition::exists() || $policy->version !== 1) {
                throw new RuntimeException('La muestra 3.0 solo se instala en una base sintética nueva, sin socios, inventario, operaciones, importaciones ni políticas modificadas. No se cambió ningún dato.');
            }
            $this->call(DemoSeeder::class);
            $admin = User::where('email', $emails[0])->sole();
            $staff = User::where('email', $emails[1])->sole();
            $lucia = User::where('email', $emails[2])->sole();
            if (! $admin->isAdmin() || $staff->role !== 'librarian' || $lucia->role !== 'reader' || $admin->trashed() || $staff->trashed() || $lucia->trashed()) {
                throw new RuntimeException('Las cuentas de la muestra tienen cambios. Usa una base sintética nueva.');
            }
            $policy->update([
                'timezone' => 'America/Mexico_City', 'currency' => 'MXN', 'max_loans' => 3, 'loan_days' => 14,
                'max_renewals' => 2, 'pickup_days' => 3, 'grace_days' => 1, 'daily_fine_cents' => 25,
                'lost_charge_cents' => 30000, 'damage_charge_cents' => 5000, 'block_balance_cents' => 2500,
                'block_overdue' => true, 'closed_weekdays' => [0], 'closure_dates' => [],
            ]);
            $today = app(LibraryCalendar::class)->today($policy->terms());
            $readers = [$lucia];
            foreach ([['Nora · Muestra con vencimiento', 'nora'], ['Leo · Muestra de recogida', 'leo'], ['Alma · Muestra de historial', 'alma']] as [$name, $key]) {
                $readers[] = User::create(['name' => $name, 'email' => 'demo.'.$key.'@example.test', 'password' => 'Demo-Lector2026!', 'role' => 'reader']);
            }
            foreach ([$admin, $staff, ...$readers] as $account) {
                $account->forceFill(['created_at' => $today->subDays(90)])->save();
            }
            foreach ($readers as $reader) {
                Date::withTestNow($today->subDays(90)->setTime(12, 0), fn () => Member::enroll($reader));
            }
            $titles = ['La arquitectura del silencio', 'Atlas de lo invisible', 'El arte de hacer preguntas', 'Jardines para otros mundos', 'Código y humanidad', 'Las ciudades que recordamos'];
            $books = array_map(fn ($title) => Book::where('title', $title)->sole(), $titles);
            foreach ([2, 1, 1, 1, 0, 1] as $index => $count) {
                for ($copy = 1; $copy <= $count; $copy++) {
                    Date::withTestNow($today->subDays([20, 20, 40, 10, 0, 2][$index])->setTime(12, 0), fn () => BookCopy::create([
                        'book_id' => $books[$index]->id, 'barcode' => 'DEMO-V3-'.($index + 1).'-'.$copy,
                        'location' => 'Muestra ficticia · Sala de lectura', 'condition' => 'good', 'status' => 'available',
                    ]));
                }
            }
            $service = app(CirculationService::class);
            $issue = function (User $reader, Book $book) use ($service, $staff): Loan {
                $request = $service->requestBook($reader, $book->id);
                $service->prepare($staff, $request->id);

                return $service->issue($staff, $request->id);
            };
            $closed = Date::withTestNow($today->subDays(30)->setTime(12, 0), fn () => $issue($readers[3], $books[2]));
            Date::withTestNow($today->subDays(24)->setTime(12, 0), fn () => $service->receive($staff, $closed->id, 'good'));
            $overdue = Date::withTestNow($today->subDays(17)->setTime(12, 0), fn () => $issue($readers[1], $books[1]));
            Date::withTestNow($today->subDays(6)->setTime(12, 0), fn () => $issue($readers[0], $books[0]));
            $service->requestBook($readers[3], $books[3]->id);
            $waiting = $service->requestBook($readers[0], $books[4]->id);
            $service->prepare($staff, $waiting->id);
            $ready = $service->requestBook($readers[2], $books[5]->id);
            $service->prepare($staff, $ready->id);
            $ledger = app(LedgerService::class);
            $ledger->assessLoan($overdue->id);
            $debtor = Member::where('user_id', $readers[1]->id)->sole();
            $balance = $ledger->summary($debtor)['balance_cents'];
            if ($balance > 1) {
                $ledger->manual($admin, $debtor->id, 'payment', intdiv($balance, 2), (string) Str::uuid(), 'Pago parcial ficticio de la muestra 3.0', 'DEMO-V3-PAGO');
            }
            $acquisitions = app(AcquisitionService::class);
            $add = fn (int $bookId, string $status, ?string $arrival, ?string $expected = null, ?string $publication = null) => $acquisitions->save($staff, [
                'book_id' => $bookId, 'status' => $status, 'incorporated_on' => $arrival, 'expected_on' => $expected,
                'publication_on' => $publication, 'is_fictional' => true, 'public_note' => 'Título y fechas ficticias para explorar la muestra 3.0; no constituyen un anuncio editorial real.',
                'source_url' => null, 'operation_key' => (string) Str::uuid(),
            ]);
            $add($books[0]->id, 'incorporated', $today->subDays(20)->toDateString());
            $add($books[1]->id, 'incorporated', $today->subDays(20)->toDateString());
            $add($books[2]->id, 'incorporated', $today->subDays(40)->toDateString());
            $add($books[5]->id, 'incorporated', $today->subDays(2)->toDateString());
            $add($books[4]->id, 'ordered', null, $today->addDays(21)->toDateString());
            $publication = $today->addDays(30);
            $future = Book::create([
                'title' => 'El horizonte de las bibliotecas · Muestra 3.0', 'author' => 'Elena del Futuro (autora ficticia)',
                'publisher' => 'Ediciones de Demostración', 'publication_year' => $publication->format('Y'),
                'category' => 'Tecnología', 'cover_color' => 'olive', 'language' => 'Español',
                'description' => 'Obra, autoría y fechas completamente ficticias de la muestra 3.0. No contiene un archivo de lectura.',
            ]);
            $add($future->id, 'announced', null, $today->addDays(60)->toDateString(), $publication->toDateString());
            AuditEvent::create(['user_id' => $admin->id, 'action' => 'demo.v3.seeded', 'subject_type' => 'DemoDataset', 'metadata' => [
                'fictional' => true, 'as_of' => $today->toDateString(), 'currency' => 'MXN', 'daily_fine_cents' => 25,
                'description' => 'Muestra sintética: dos préstamos activos, uno vencido, un historial, solicitud pendiente, reserva y recogida; tarifas ficticias.',
            ]]);
        }, 3);
    }
}
