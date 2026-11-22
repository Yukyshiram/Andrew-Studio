<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('financial_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('loan_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->enum('kind', ['overdue', 'lost', 'damage', 'payment', 'credit', 'adjustment', 'reversal']);
            $table->bigInteger('amount_cents');
            $table->char('currency', 3);
            $table->string('event_key', 160)->unique();
            $table->foreignId('reversal_of')->nullable()->unique()->constrained('financial_entries')->restrictOnDelete();
            $table->string('reason', 500);
            $table->string('reference', 100)->nullable();
            $table->date('occurred_on');
            $table->string('timezone', 80);
            $table->timestamp('created_at');
            $table->index(['member_id', 'occurred_on']);
            $table->index(['occurred_on', 'kind']);
        });
        Schema::table('loans', function (Blueprint $table): void {
            $table->timestamp('fee_settled_at')->nullable();
            $table->index(['status', 'fee_settled_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_entries');
        Schema::table('loans', function (Blueprint $table): void {
            $table->dropIndex(['status', 'fee_settled_at']);
            $table->dropColumn('fee_settled_at');
        });
    }
};
