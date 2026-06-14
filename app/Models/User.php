<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';

    protected $primaryKey = 'id_user';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id_user',
        'nama_lengkap',
        'name',
        'email',
        'password_hash',
        'role',
        'id_posbankum',
        'nip',
        'email_kantor',
        'nomor_telepon',
        'nomor_kantor',
        'jabatan',
        'unit_kerja',
        'alamat_kantor',
        'foto_profile',
        'status',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function getNameAttribute($value)
    {
        return $value ?: $this->nama_lengkap;
    }
}
