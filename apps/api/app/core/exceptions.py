from fastapi import status


class ValoraException(Exception):
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, code: str | None = None) -> None:
        self.message = message or self.__class__.message
        self.code = code or self.__class__.code
        super().__init__(self.message)


class NotFoundError(ValoraException):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message = "Resource not found."


class ConflictError(ValoraException):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    message = "Resource already exists."


class ValidationError(ValoraException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"
    message = "Validation failed."


class UnauthorizedError(ValoraException):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    message = "Authentication required."


class ForbiddenError(ValoraException):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class ImportError(ValoraException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "IMPORT_ERROR"
    message = "Failed to import file."
