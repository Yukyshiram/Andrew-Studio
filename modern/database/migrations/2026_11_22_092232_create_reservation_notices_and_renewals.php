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
        Schema::create('library_notices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->string('event_key', 160)->unique();
            $table->string('kind', 50);
            $table->string('message', 1000);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['member_id', 'read_at']);
        });
        Schema::create('loan_renewals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('loan_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->uuid('operation_key')->unique();
            $table->unsignedInteger('renewal_number');
            $table->date('previous_due_on');
            $table->date('due_on');
            $table->timestamps();
            $table->unique(['loan_id', 'renewal_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_renewals');
        Schema::dropIfExists('library_notices');
    }
};
