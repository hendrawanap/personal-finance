import { axiosPrivate } from '@/lib/instance'
import { v } from '@/lib/apiVersion'
import { ApiEnvelope } from '@/types/auth/auth'
import {
    CreateUserRequest,
    DeleteUserResult,
    SyncUserPropertiesRequest,
    UpdateUserRequest,
    User,
    UserPermissionItem,
} from '@/types/user/user'

export async function getUsers(): Promise<User[]> {
    const res = await axiosPrivate.get<ApiEnvelope<User[]>>(v('users'))
    return res.data.data
}

export async function getUser(id: string): Promise<User> {
    const res = await axiosPrivate.get<ApiEnvelope<User>>(
        v('users', `/${id}`),
    )
    return res.data.data
}

export async function createUser(payload: CreateUserRequest): Promise<User> {
    const res = await axiosPrivate.post<ApiEnvelope<User>>(
        v('users'),
        payload,
    )
    return res.data.data
}

export async function updateUser(
    id: string,
    payload: UpdateUserRequest,
): Promise<User> {
    const res = await axiosPrivate.patch<ApiEnvelope<User>>(
        v('users', `/${id}`),
        payload,
    )
    return res.data.data
}

export async function deleteUser(id: string): Promise<DeleteUserResult> {
    const res = await axiosPrivate.delete<ApiEnvelope<DeleteUserResult>>(
        v('users', `/${id}`),
    )
    return res.data.data
}

export async function setUserVerification(
    id: string,
    isVerified: boolean,
): Promise<User> {
    const res = await axiosPrivate.patch<ApiEnvelope<User>>(
        v('users', `/${id}/verification`),
        { isVerified },
    )
    return res.data.data
}

export async function assignUserRole(
    userId: string,
    roleId: string,
): Promise<User> {
    const res = await axiosPrivate.post<ApiEnvelope<User>>(
        v('users', `/${userId}/roles`),
        { roleId },
    )
    return res.data.data
}


/**
 * Lawan dari assignUserRole. DELETE /users/:userId/roles/:roleId — ditambahkan
 * 2026-09-04 supaya dialog role bisa mencabut, bukan cuma menambah.
 */
export async function removeUserRole(
    userId: string,
    roleId: string,
): Promise<void> {
    await axiosPrivate.delete(v('users', `/${userId}/roles/${roleId}`))
}


export async function syncUserPermissions(
    userId: string,
    permissions: UserPermissionItem[],
): Promise<User> {
    const res = await axiosPrivate.put<ApiEnvelope<User>>(
        v('users', `/${userId}/permissions`),
        { permissions },
    )
    return res.data.data
}

/**
 * PUT /users/:id/properties — batas property akun. Butuh users:assign-property.
 *
 * Perhatikan: perubahan di sini baru terasa untuk user yang bersangkutan
 * setelah token-nya di-refresh, karena scope-nya ikut JWT. Sama seperti
 * permission.
 */
export async function syncUserProperties(
    userId: string,
    payload: SyncUserPropertiesRequest,
): Promise<User> {
    const res = await axiosPrivate.put<ApiEnvelope<User>>(
        v('users', `/${userId}/properties`),
        payload,
    )
    return res.data.data
}
