<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table): void {
            $table->string('isbn', 13)->nullable()->index();
            $table->string('edition', 100)->nullable();
            $table->string('language', 80)->default('No registrado');
        });
        Schema::create('library_policies', function (Blueprint $table): void {
            $table->unsignedInteger('id')->primary();
            $table->string('timezone', 80)->default('America/Mexico_City');
            $table->string('currency', 3)->default('MXN');
            $table->unsignedInteger('max_loans')->default(3);
            $table->unsignedInteger('loan_days')->default(14);
            $table->unsignedInteger('max_renewals')->default(2);
            $table->unsignedInteger('pickup_days')->default(3);
            $table->unsignedInteger('grace_days')->default(0);
            $table->unsignedInteger('daily_fine_cents')->default(0);
            $table->unsignedInteger('lost_charge_cents')->default(0);
            $table->unsignedInteger('damage_charge_cents')->default(0);
            $table->unsignedInteger('block_balance_cents')->default(0);
            $table->boolean('block_overdue')->default(true);
            $table->json('closed_weekdays');
            $table->json('closure_dates');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        DB::table('library_policies')->insert([
            'id' => 1, 'closed_weekdays' => '[0]', 'closure_dates' => '[]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        Schema::create('members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('card_number', 40)->unique();
            $table->enum('status', ['active', 'suspended'])->default('active')->index();
            $table->string('phone', 40)->nullable();
            $table->date('expires_on')->nullable();
            $table->unsignedInteger('loan_limit')->nullable();
            $table->timestamps();
        });
        Schema::create('book_copies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('book_id')->constrained()->restrictOnDelete();
            $table->string('barcode', 80)->unique();
            $table->string('location', 160);
            $table->enum('condition', ['good', 'worn', 'damaged', 'lost'])->default('good');
            $table->enum('status', ['available', 'held', 'loaned', 'repair', 'lost', 'withdrawn'])->default('available');
            $table->timestamps();
            $table->index(['book_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('book_copies');
        Schema::dropIfExists('members');
        Schema::dropIfExists('library_policies');
        Schema::table('books', function (Blueprint $table): void {
            $table->dropIndex(['isbn']);
            $table->dropColumn(['isbn', 'edition', 'language']);
        });
    }
};
