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
        Schema::create('circulation_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('book_id')->constrained()->restrictOnDelete();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['pending', 'waiting', 'ready', 'fulfilled', 'rejected', 'cancelled', 'expired'])->default('pending');
            $table->string('active_key', 80)->nullable()->unique();
            $table->timestamp('requested_at');
            $table->unsignedSmallInteger('priority')->default(0);
            $table->date('ready_until')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->string('decision_reason', 500)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['book_id', 'status', 'requested_at']);
            $table->index(['member_id', 'status']);
        });
        Schema::create('loans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circulation_request_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('book_copy_id')->constrained()->restrictOnDelete();
            $table->foreignId('active_copy_id')->nullable()->unique()->constrained('book_copies')->restrictOnDelete();
            $table->enum('status', ['active', 'returned', 'lost'])->default('active');
            $table->timestamp('checked_out_at');
            $table->date('due_on');
            $table->unsignedInteger('renewal_count')->default(0);
            $table->timestamp('returned_at')->nullable();
            $table->enum('returned_condition', ['good', 'worn', 'damaged', 'lost'])->nullable();
            $table->foreignId('issued_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->json('terms');
            $table->timestamps();
            $table->index(['member_id', 'status']);
            $table->index(['status', 'due_on']);
        });
        Schema::create('copy_allocations', function (Blueprint $table): void {
            $table->foreignId('copy_id')->primary()->constrained('book_copies')->restrictOnDelete();
            $table->foreignId('circulation_request_id')->unique()->constrained()->restrictOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('copy_allocations');
        Schema::dropIfExists('loans');
        Schema::dropIfExists('circulation_requests');
    }
};
